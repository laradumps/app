import { AcceptConnection, Client, ConnectConfig, TcpConnectionDetails } from "ssh2";
import { readFileSync } from "fs";
import { ipcMain, Notification } from "electron";
import net from "net";
import axios from "axios";
import { Payload } from "@/types/Payload";

class SSHClient {
    private readonly config: ConnectConfig;
    private conn: Client;
    private isConnected: boolean;
    private readonly name: string;
    private readonly newWindow: boolean;

    constructor(connectionConfig: any) {
        this.config = {
            host: connectionConfig.host,
            port: connectionConfig.port,
            username: connectionConfig.username,
            password: "",
            privateKey: ""
        };

        this.name = connectionConfig.name;
        this.newWindow = connectionConfig.new_window;

        if (connectionConfig.auth_type === "password" && connectionConfig.password) {
            this.config.password = connectionConfig.password;
        }
        if (connectionConfig.auth_type === "key" && connectionConfig.private_key) {
            try {
                this.config.privateKey = readFileSync(connectionConfig.private_key, "utf8");
            } catch (error: any) {
                //
            }
        }
        this.conn = new Client();
        this.isConnected = false;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.conn
                .on("ready", () => {
                    this.isConnected = true;
                    resolve();
                })
                .on("error", (err) => {
                    reject(err);
                })
                .connect(this.config);
        });
    }

    async forwardIn(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.conn
                .forwardIn("localhost", port, (err: unknown) => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                })
                .on("tcp connection", (info: TcpConnectionDetails, accept: AcceptConnection) => {
                    // Forward the connection to the local application
                    const stream = accept();
                    const localSocket = net.connect(port, "127.0.0.1", () => {
                        let buffer = "";
                        let expectedLength = 0;

                        stream.on("data", async (data: Buffer) => {
                            try {
                                buffer += data.toString();

                                if (expectedLength === 0) {
                                    const contentLengthMatch = buffer.match(/Content-Length:\s*(\d+)/);
                                    if (contentLengthMatch) {
                                        expectedLength = parseInt(contentLengthMatch[1], 10);
                                    }
                                }

                                const jsonStartIndex = buffer.indexOf("{");
                                if (expectedLength > 0 && buffer.length >= expectedLength + jsonStartIndex) {
                                    const jsonString = buffer.substring(jsonStartIndex, jsonStartIndex + expectedLength);

                                    const payload: Payload = JSON.parse(jsonString);

                                    const fullUrl = `http://${info.destIP}:${info.destPort}/api/dumps`;

                                    await axios.post(fullUrl, payload);

                                    const screenPayload = {
                                        ...payload,
                                        type: "screen",
                                        screen: {
                                            screen_name: this.name + " - " + this.config.host,
                                            new_window: this.newWindow,
                                            raise_in: 0,
                                            pinned: false,
                                            visible: false
                                        }
                                    };
                                    await axios.post(fullUrl, screenPayload);

                                    buffer = buffer.substring(jsonStartIndex + expectedLength);
                                    expectedLength = 0;
                                }
                            } catch (postError) {
                                new Notification({
                                    title: "SSH",
                                    body: "Error sending HTTP POST"
                                }).show();
                                console.error("Error sending HTTP POST:", postError);
                            }
                        });

                        localSocket.pipe(stream);
                    });

                    localSocket.on("error", (err) => {
                        console.error("Local socket error:", err);
                        stream.end();
                    });
                });
        });
    }

    disconnect() {
        if (this.isConnected) {
            this.conn.end();
            this.isConnected = false;
        }
    }
}

let sshClient: SSHClient | null = null;

export const init = async () => {
    ipcMain.on("ssh:connect", connect);
    ipcMain.on("ssh:listen", listen);
    ipcMain.on("ssh:disconnect", disconnect);
};

export const connect = async (event: any, config: any, data: any = {}) => {
    sshClient = new SSHClient(config);
    try {
        await sshClient.connect();

        if (data.notify) {
            new Notification({
                title: "Connected",
                body: config.host
            }).show();
        }
        event.reply("ssh:connect-response", {
            connected: true,
            data: data,
            config: config
        });
    } catch (error: any) {
        handleConnectionFailed(event, config, error, data);
    } finally {
        sshClient.disconnect();
    }
};

export const listen = async (event: any, config: any) => {
    sshClient = new SSHClient(config);
    try {
        await sshClient.connect();
        await sshClient.forwardIn(9191);
        event.reply("ssh:listen-response", {
            connected: true
        });
    } catch (error: any) {
        event.reply("ssh:listen-response", {
            connected: false
        });
        new Notification({
            title: "Error",
            body: error.message ?? "Connection to the server failed"
        }).show();
    }
};

export const disconnect = async (event: any) => {
    if (sshClient) {
        sshClient.disconnect();
    }
};

const handleConnectionFailed = (event: any, config: any, error: any, data: object = {}) => {
    new Notification({
        title: "Error",
        body: error.message
    }).show();
    event.reply("ssh:connect-response", {
        connected: false,
        data: data,
        config: config
    });
};
