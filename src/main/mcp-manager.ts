import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { app, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import * as settings from './settings';

let mcpProcess: ChildProcess | null = null;
let consolePipeBroken = false;

const getMcpServerPath = () => {
    const appPath = app.getAppPath();
    const isPackaged = app.isPackaged;

    if (!isPackaged) {
        return path.resolve(appPath, 'dist', 'mcp-server.js');
    }

    const unpackedPath = path.resolve(appPath.replace('app.asar', 'app.asar.unpacked'), 'dist', 'mcp-server.js');
    if (fs.existsSync(unpackedPath)) {
        return unpackedPath;
    }

    return path.resolve(appPath, 'dist', 'mcp-server.js');
};

const sendLog = (message: string, type: 'info' | 'error' = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logLine = `[${timestamp}] [${type}] ${message}`;

    if (!consolePipeBroken) {
        try {
            console.log(logLine);
        } catch (error) {
            if ((error as NodeJS.ErrnoException)?.code === 'EPIPE') {
                consolePipeBroken = true;
            } else {
                throw error;
            }
        }
    }

    BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('mcp:log', logLine);
    });
};

const resolveNodeCommand = () => {
    const customNode = process.env.MCP_NODE_PATH;
    if (customNode && fs.existsSync(customNode)) {
        return { command: customNode, env: { ...process.env } };
    }

    return {
        command: process.execPath,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    };
};

const ensureServerBundle = (scriptPath: string) => {
    if (fs.existsSync(scriptPath)) {
        return true;
    }

    sendLog(`MCP server bundle not found at ${scriptPath}. Run "npm run build" to regenerate it.`, 'error');
    return false;
};

export const startMcpServer = () => {
    stopMcpServer();

    const currentSettings = settings.getSettings();

    if (!currentSettings.mcp_enabled) {
        sendLog('MCP server is disabled in the current settings.');
        return;
    }

    const scriptPath = getMcpServerPath();
    const port = currentSettings.mcp_port || 3002;

    if (!ensureServerBundle(scriptPath)) {
        return;
    }

    const { command, env } = resolveNodeCommand();

    sendLog(`Starting MCP server on port ${port}...`);

    try {
        mcpProcess = spawn(command, [scriptPath, '--port', port.toString()], {
            stdio: ['ignore', 'pipe', 'pipe'],
            env
        });
    } catch (error) {
        sendLog(`Failed to spawn MCP server process: ${(error as Error).message}`, 'error');
        return;
    }

    if (mcpProcess.stdout) {
        mcpProcess.stdout.on('data', (data) => {
            sendLog(data.toString().trim());
        });
    }

    if (mcpProcess.stderr) {
        mcpProcess.stderr.on('data', (data) => {
            sendLog(data.toString().trim(), 'error');
        });
    }

    mcpProcess.on('error', (err) => {
        sendLog(`Failed to start MCP server: ${err.message}`, 'error');
    });

    mcpProcess.on('exit', (code, signal) => {
        sendLog(`MCP server exited with code ${code} and signal ${signal}`);
        if (code !== 0 && code !== null) {
            // Optional: Restart on a crash?
        }
    });
};

export const stopMcpServer = () => {
    if (mcpProcess) {
        console.log('Stopping MCP server...');
        mcpProcess.kill();
        mcpProcess = null;
    }
};

export const init = async () => {
    startMcpServer();

    ipcMain.on('mcp:restart', () => {
        startMcpServer();
    });
};
