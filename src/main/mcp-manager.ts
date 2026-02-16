import { ipcMain, BrowserWindow } from 'electron';
import * as settings from './settings';
import { createMcpServer, McpServerInstance } from '../mcp-server';
import os from 'os';

let mcpServerInstance: McpServerInstance | null = null;
let consolePipeBroken = false;
let mcpStartTime: Date | null = null;
const mcpLogsBuffer: string[] = [];

const sendLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logLine = `[${timestamp}] [${type}] ${message}`;

    mcpLogsBuffer.push(logLine);
    if (mcpLogsBuffer.length > 100) {
        mcpLogsBuffer.shift();
    }

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

const getSystemInfo = () => {
    return {
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch,
        memory: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
        uptime: process.uptime().toFixed(2)
    };
};

export const startMcpServer = async () => {
    await stopMcpServer();

    const currentSettings = settings.getSettings();

    if (!currentSettings.mcp_enabled) {
        sendLog('MCP server is disabled in the current settings.');
        return;
    }

    const port = currentSettings.mcp_port || 3002;
    const systemInfo = getSystemInfo();

    sendLog('===================================================');
    sendLog(`Starting MCP Server`);
    sendLog(`   Platform: ${systemInfo.platform} (${systemInfo.arch})`);
    sendLog(`   Node.js: ${systemInfo.nodeVersion}`);
    sendLog(`   Port: ${port}`);
    sendLog('===================================================');

    mcpStartTime = new Date();

    try {
        mcpServerInstance = await createMcpServer(port, (message, type) => {
            let enhancedMessage = message;

            if (mcpStartTime) {
                const elapsedMs = Date.now() - mcpStartTime.getTime();
                const elapsed = elapsedMs > 1000 ? `${(elapsedMs / 1000).toFixed(2)}s` : `${elapsedMs}ms`;
                enhancedMessage = `[+${elapsed}] ${message}`;
            }

            sendLog(enhancedMessage, type);
        });

        sendLog(`MCP Server started successfully`, 'success');
        sendLog(`   URL: http://127.0.0.1:${port}/sse`, 'success');
        sendLog(`   Status: CONNECTED`, 'success');
        sendLog('===================================================', 'success');

        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('mcp:status', 'connected');
        });
    } catch (error) {
        const errorMessage = (error as Error).message;
        sendLog(`Failed to start MCP Server: ${errorMessage}`, 'error');
        sendLog(`   Check if port ${port} is available`, 'error');
        sendLog(`   Check logs for more details`, 'error');
        sendLog('===================================================', 'error');
        mcpServerInstance = null;

        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('mcp:status', 'error');
        });
    }
};

export const stopMcpServer = async () => {
    if (mcpServerInstance) {
        sendLog('Stopping MCP Server...');
        mcpServerInstance.stop();
        mcpServerInstance = null;
        mcpStartTime = null;
        sendLog('MCP Server stopped successfully', 'success');

        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('mcp:status', 'disabled');
        });
    }
};

export const init = async () => {
    await startMcpServer();

    ipcMain.on('mcp:restart', async () => {
        await startMcpServer();
    });

    ipcMain.on('mcp:check-status', () => {
        const status = mcpServerInstance ? 'connected' : 'disabled';
        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('mcp:status', status);
        });
    });

    ipcMain.handle('mcp:get-logs-buffer', () => {
        return mcpLogsBuffer;
    });
};
