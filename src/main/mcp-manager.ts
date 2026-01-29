import { spawn, ChildProcess } from "child_process";
import { app, ipcMain, BrowserWindow } from "electron";
import path from "path";
import * as settings from "./settings";

let mcpProcess: ChildProcess | null = null;

const getMcpServerPath = () => {
    const appPath = app.getAppPath();
    const isPackaged = app.isPackaged;

    if (!isPackaged) {
        return path.resolve(appPath, "dist", "mcp-server.js");
    }

    return path.resolve(appPath.replace("app.asar", "app.asar.unpacked"), "dist", "mcp-server.js");
};

export const startMcpServer = () => {
    stopMcpServer();

    const currentSettings = settings.getSettings();

    if (!currentSettings.mcp_enabled) {
        return;
    }

    const scriptPath = getMcpServerPath();
    const port = currentSettings.mcp_port || 3002;

    const sendLog = (message: string, type: "info" | "error" = "info") => {
        const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
        const logLine = `[${timestamp}] [${type}] ${message}`;
        console.log(logLine);
        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send("mcp:log", logLine);
        });
    };

    sendLog(`Starting MCP server on port ${port}...`);

    mcpProcess = spawn("node", [scriptPath, "--port", port.toString()], {
        stdio: "pipe",
        env: process.env
    });

    if (mcpProcess.stdout) {
        mcpProcess.stdout.on("data", (data) => {
            sendLog(data.toString().trim());
        });
    }

    if (mcpProcess.stderr) {
        mcpProcess.stderr.on("data", (data) => {
            sendLog(data.toString().trim(), "error");
        });
    }

    mcpProcess.on("error", (err) => {
        sendLog(`Failed to start MCP server: ${err.message}`, "error");
    });

    mcpProcess.on("exit", (code, signal) => {
        sendLog(`MCP server exited with code ${code} and signal ${signal}`);
        if (code !== 0 && code !== null) {
            // Optional: Restart on a crash?
        }
    });
};

export const stopMcpServer = () => {
    if (mcpProcess) {
        console.log("Stopping MCP server...");
        mcpProcess.kill();
        mcpProcess = null;
    }
};

export const init = async () => {
    startMcpServer();

    ipcMain.on("mcp:restart", () => {
        startMcpServer();
    });
};
