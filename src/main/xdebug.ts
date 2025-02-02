import { BrowserWindow, ipcMain, IpcMainEvent } from "electron";
import fs from "fs";
import XDebugServer from "./xdebug-server";

const xdebugServer = XDebugServer.getInstance();

const isDev: boolean = process.env.NODE_ENV === "development";

export const init = async (mainWindow: BrowserWindow) => {
    ipcMain.on("send-xdebug-command", async (event, command) => {
        try {
            xdebugServer.sendCommand(command);
            const response = await xdebugServer.getResponse();
            event.reply("xdebug-response", response);
        } catch (error) {
            event.reply("xdebug-error", error.message);
        }
    });

    ipcMain.on("read-file", (event, filePath) => {
        fs.readFile(filePath, "utf-8", (err, data) => {
            if (err) {
                event.reply("file-read-error", err.message);
            } else {
                event.reply("file-read-success", data);
            }
        });
    });

    ipcMain.on("connect-xdebug", (event) => {
        try {
            mainWindow.setSize(isDev ? 1200 : 1100, 720);

            event.reply("xdebug-connected", true);
        } catch (error) {
            event.reply("xdebug-disconnected", false);
        }
    });

    ipcMain.on("disconnect-xdebug", (event) => {
        if (xdebugServer) {
            mainWindow.setSize(isDev ? 1300 : 680, 640);

            xdebugServer.closeClient();
            event.reply("xdebug-disconnected");
        }
    });

    ipcMain.on("main:setting-get-xdebug-environments", (event: IpcMainEvent, applicationPath: string): void => {
        const file = applicationPath + "/laradumps.yaml";

        try {
            const yaml = require("js-yaml");
            const fs = require("fs");

            const readFile = yaml.load(fs.readFileSync(file, "utf8"));

            const parseYaml = {
                workdir: readFile.app.workdir,
                project_path: readFile.app.project_path,
                separator: readFile.app?.separator ?? "/",
                wsl_config: readFile.app.wsl_config,
                client_host: readFile.xdebug?.client_host ?? "0.0.0.0",
                client_port: readFile.xdebug?.client_port ?? 9003
            };

            xdebugServer.startClient(mainWindow, parseYaml);

            event.reply("settings:env-xdebug-file-contents", parseYaml);
        } catch (e) {
            console.error(e);
            const parseYaml = {
                workdir: "",
                project_path: "",
                separator: "/",
                wsl_config: "",
                client_host: "0.0.0.0",
                client_port: 9003
            };

            xdebugServer.startClient(mainWindow, parseYaml);

            event.reply("settings:env-xdebug-file-contents");
        }
    });
};
