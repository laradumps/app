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
        await watcherPath(mainWindow, args.project_path);

        this.serverSocket = net.createServer((socket: Socket) => {
            this.clientSocket = socket;
            this.mainWindow = mainWindow;

            console.log('Connected to XDebug server');

            this.emit('connection');

            socket.on('data', (data): void => {
                const xmlData = processIncomingData(data.toString());

                if (isDev) {
                    console.log('Receive XML data:', xmlData);
                }

                if (xmlData) {
                    mainWindow.webContents.send('xdebug-response', xmlData.toString());
                }
            });

            const processIncomingData = (data) => {
                const xmlStartIndex = data.indexOf('<?xml');
                if (xmlStartIndex !== -1) {
                    return data.slice(xmlStartIndex);
                }
                return null;
            };

            socket.on('error', (err) => {
                this.closeClient();
            });
        });

        this.serverSocket.listen(args.client_port, args.client_host, (): void => {
            console.table(args);
        });

        this.serverSocket.on('error', (err): void => {
            this.closeClient();
            // mainWindow.webContents.send("xdebug-connection-status", {
            //     connected: false,
            //     err: err.message
            // });
        });

        this.serverSocket.on('listening', (): void => {
            // mainWindow.webContents.send("xdebug-connection-status", {
            //     connected: true
            // });
        });

        this.serverSocket.on('close', (): void => {
            // mainWindow.webContents.send("xdebug-connection-status", {
            //     connected: false,
            //     err: "closed",
            // });
        });
    }

    closeClient() {
        if (this.clientSocket) {
            this.clientSocket.end();
            this.clientSocket.destroy();
            this.clientSocket = null;
        }

        if (this.serverSocket) {
            this.serverSocket.close();
            this.serverSocket = null;
        }
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

    async getResponse(): Promise<string> {
        if (!this.clientSocket) {
            throw new Error('No client connected');
        }

        return new Promise((resolve, reject) => {
            let message = '';

            const onData = (data: Buffer) => {
                message += data.toString();
                if (message.endsWith('\0')) {
                    this.clientSocket?.removeListener('data', onData);
                    resolve(message.slice(0, -1));
                }
            };

            this.clientSocket && this.clientSocket.on('data', onData);

            this.clientSocket &&
                this.clientSocket.on('error', (err) => {
                    reject(new Error('Client socket error: ' + err.message));
                });
        });
    }
}

export default XDebugServer;
