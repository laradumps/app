import net from "net";
import { EventEmitter } from "events";
import { BrowserWindow } from "electron";
import { XDebugYml } from "@/types/XDebug";
import { Socket } from "node:net";
const isDev: boolean = process.env.NODE_ENV === "development";

import { getBreakpoints } from './watcher';

class XDebugServer extends EventEmitter {
    private static instance: XDebugServer;
    private serverSocket: net.Server | null = null;
    private clientSocket: net.Socket | null = null;
    private breakpointsSent: boolean = false;
    private mainWindow: BrowserWindow;

    private currentBreakpoints: Set<string> = new Set();

    constructor() {
        super();
        this.setMaxListeners(100)
    }

    public static getInstance(): XDebugServer {
        if (!XDebugServer.instance) {
            XDebugServer.instance = new XDebugServer();
        }
        return XDebugServer.instance;
    }

    public updateBreakpoints() {
        if (this.clientSocket) {
            this.sendBreakpointsToXdebug();
        } else {
            console.error("No client connected. Cannot update breakpoints.");
        }
    }

    startClient(mainWindow: BrowserWindow, args: XDebugYml) {
        this.serverSocket = net.createServer((socket: Socket) => {
            this.clientSocket = socket;
            this.breakpointsSent = false;
            this.mainWindow = mainWindow

            console.log("Connected to XDebug server");

            this.emit("connection");

            socket.on("data", (data): void => {
                const xmlData = processIncomingData(data.toString());

                if (isDev) {
                    console.log("Receive XML data:", xmlData);
                }

                if (!this.breakpointsSent) {
                   // this.sendBreakpointsToXdebug();
                   // this.breakpointsSent = true;
                }

                if (xmlData) {
                    mainWindow.webContents.send("xdebug-response", xmlData.toString());
                    console.log("\n");
                }
            });

            const processIncomingData = (data) => {
                const xmlStartIndex = data.indexOf("<?xml");

                if (xmlStartIndex !== -1) {
                    return data.slice(xmlStartIndex);
                }

                console.error("Invalid XML response:", data);
                return null;
            };

            socket.on("error", (err) => {
                console.error("Client socket error:", err.message);
                this.closeClient(mainWindow);
            });
        });

        this.serverSocket.listen(args.client_port, args.client_host, (): void => {
            console.log("\n");
            console.log(`--- Listening ---`);
            console.table(args);
            console.log("\n");
        });

        this.serverSocket.on("error", (err): void => {
            console.error("Server socket error:", err.message);
            this.closeClient(mainWindow);

            mainWindow.webContents.send("xdebug-connection-status", {
                connected: false,
                err: err.message,
                ...args
            });
        });

        this.serverSocket.on("listening", (): void => {
            console.log(`Server is listening on ${args.client_host}:${args.client_port}`);

            mainWindow.webContents.send("xdebug-connection-status", {
                connected: true,
                ...args
            });
        });

        this.serverSocket.on("close", (): void => {
            console.log("Server closed");
            mainWindow.webContents.send("xdebug-connection-status", {
                connected: false,
                err: 'closed',
                ...args
            });
        });
    }

    sendBreakpointsToXdebug() {
        if (!this.clientSocket) {
            console.error("No client connected. Cannot send breakpoints.");
            return;
        }

        const breakpoints = getBreakpoints();
        const newBreakpointsSet = new Set<string>();

        breakpoints.forEach((breakpoint, id) => {
            if (breakpoint.enabled) {
                const identifier = `${breakpoint.url}:${breakpoint.line}`;
                newBreakpointsSet.add(identifier);

                if (!this.currentBreakpoints.has(identifier)) {
                    const cmd = `breakpoint_set -i ${id} -t line -f ${breakpoint.url} -n ${breakpoint.line}\0`;
                    this.clientSocket.write(cmd);
                    console.log(`Sent breakpoint: ${cmd}`);
                }
            }
        });

        this.currentBreakpoints.forEach((identifier) => {
            if (!newBreakpointsSet.has(identifier)) {
                // const cmd = `breakpoint_remove -i ${identifier}\0`;
                this.clientSocket.write(cmd);
                console.log(`Removed breakpoint: ${cmd}`);
            }
        });

        this.currentBreakpoints = newBreakpointsSet;
    }

    closeClient(mainWindow = null) {
        if (this.clientSocket) {
            this.clientSocket.end();
            this.clientSocket.destroy();
            this.clientSocket = null;
        }

        if (this.serverSocket) {
            this.serverSocket.close();
            this.serverSocket = null;
        }

        if (mainWindow) {
            mainWindow.webContents.send("xdebug-connect-closed");
        }

        console.log("Client and server sockets closed");
    }

    sendCommand(command: string) {
        if (!this.clientSocket) {
            console.error("No client connected. Cannot send command.");
            throw new Error("No client connected");
        }

        const message = `${command}\0`;
        this.clientSocket.write(message, (err) => {
            if (err) {
                this.mainWindow.webContents.send("send-command-error", {
                    error: err.message
                })
                console.error("Failed to send command:", err.message);
                // throw new Error("Failed to send command");
            }
            console.log("Command sent:", command);
        });
    }

    async getResponse(): Promise<string> {
        if (!this.clientSocket) {
            console.error("No client connected. Cannot get response.");
            throw new Error("No client connected");
        }

        return new Promise((resolve, reject) => {
            let message = "";

            const onData = (data: Buffer) => {
                message += data.toString();
                if (message.endsWith("\0")) {
                    this.clientSocket?.removeListener("data", onData);
                    resolve(message.slice(0, -1));
                }
            };

            this.clientSocket.on("data", onData);

            this.clientSocket.on("error", (err) => {
                console.error("Client socket error:", err.message);
                reject(new Error("Client socket error: " + err.message));
            });
        });
    }
}

export default XDebugServer;
