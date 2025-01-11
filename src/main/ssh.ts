import { Client, ConnectConfig } from "ssh2";
import { readFileSync } from "fs";
import { ipcMain, Notification } from "electron";
import net from "net";

class SSHClient {
    private config: ConnectConfig;
    private conn: Client;
    private isConnected: boolean;

    constructor(connectionConfig: any) {
        this.config = {
            host: connectionConfig.host,
            port: connectionConfig.port,
            username: connectionConfig.username,
            password: "",
            privateKey: ""
        };
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
                .on("tcp connection", (info, accept) => {
                    // Forward the connection to the local application
                    const stream = accept();
                    const localSocket = net.connect(port, "127.0.0.1", () => {
                        stream.pipe(localSocket).pipe(stream); // Forward data between remote and local
                    });

                    // Handle errors
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
    } catch (error: unknown) {
        event.reply("ssh:listen-response", {
            connected: false
        });
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
