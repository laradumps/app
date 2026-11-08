import net from 'net';
import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { XDebugYml } from '@/types/XDebug';
import { Socket } from 'node:net';
import { watcherPath } from './watcher';

const isDev: boolean = process.env.NODE_ENV === 'development';

class XDebugServer extends EventEmitter {
    private static instance: XDebugServer;
    private serverSocket: net.Server | null = null;
    private clientSocket: net.Socket | null = null;
    private sockets: Set<net.Socket> = new Set();
    private mainWindow: BrowserWindow;

    constructor() {
        super();
        this.setMaxListeners(100);
    }

    public static getInstance(): XDebugServer {
        if (!XDebugServer.instance) {
            XDebugServer.instance = new XDebugServer();
        }
        return XDebugServer.instance;
    }

    async startClient(mainWindow: BrowserWindow, args: XDebugYml) {
        await this.stopServer();

        this.mainWindow = mainWindow;

        await watcherPath(mainWindow, args.project_path);

        this.serverSocket = net.createServer((socket: Socket) => {
            if (this.clientSocket && this.clientSocket !== socket) {
                this.clientSocket.removeAllListeners();
                this.clientSocket.destroy();
            }

            this.clientSocket = socket;
            this.sockets.add(socket);
            this.mainWindow = mainWindow;

            console.log('Connected to XDebug server');

            this.emit('connection');

            let buffer = Buffer.alloc(0);

            socket.on('data', (data: Buffer): void => {
                buffer = Buffer.concat([buffer, data]);

                let end: number;
                while ((end = buffer.indexOf(0)) !== -1) {
                    const packet = buffer.subarray(0, end).toString();
                    buffer = buffer.subarray(end + 1);

                    if (!packet.startsWith('<')) continue;

                    if (isDev) {
                        console.log('Receive XML data:', packet);
                    }

                    mainWindow.webContents.send('xdebug-response', packet);
                }
            });

            const endSession = () => {
                socket.removeAllListeners();
                socket.destroy();
                this.sockets.delete(socket);
                if (this.clientSocket === socket) {
                    this.clientSocket = null;
                }
            };

            socket.on('error', endSession);
            socket.on('end', endSession);
            socket.on('close', endSession);
        });

        this.serverSocket.listen(args.client_port, args.client_host, (): void => {
            console.table(args);
        });

        this.serverSocket.on('error', (err): void => {
            this.stopServer();
        });
    }

    closeClient() {
        return this.stopServer();
    }

    private stopServer(): Promise<void> {
        for (const socket of this.sockets) {
            socket.removeAllListeners();
            socket.destroy();
        }
        this.sockets.clear();
        this.clientSocket = null;

        const server = this.serverSocket;
        this.serverSocket = null;

        if (!server) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            server.removeAllListeners();
            server.close(() => resolve());
        });
    }

    sendCommand(command: string) {
        if (!this.clientSocket) {
            throw new Error('No client connected');
        }

        const message = `${command}\0`;
        this.clientSocket.write(message, (err) => {
            if (err) {
                this.mainWindow.webContents.send('send-command-error', {
                    error: err.message
                });
            }
        });
    }
}

export default XDebugServer;
