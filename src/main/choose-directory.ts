import { BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";
import fs from "fs";

const isWindows: boolean = process.platform === "win32";

const chooseDirectory = (mainWindow: BrowserWindow, event, args) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
        });

        if (result.canceled) {
            mainWindow.webContents.send("choose-directory", { error: "Operation cancelled by user." });
            return;
        }

        const selectedDir = result.filePaths[0];

        const yaml = require("js-yaml");

        const configFilePath = path.join(selectedDir, "laradumps.yaml");

        const fromLaravel = path.join(selectedDir, "vendor", "laradumps", "laradumps", "src", "Commands", "laradumps-base.yaml");
        const fromCore = path.join(selectedDir, "vendor", "laradumps", "laradumps-core", "src", "Commands", "laradumps-base.yaml");

        let config = {};

        if (fs.existsSync(fromLaravel)) {
            const laravelConfig = yaml.load(fs.readFileSync(fromLaravel, "utf8"));
            const coreConfig = yaml.load(fs.readFileSync(fromCore, "utf8"));

            config = { ...coreConfig, ...laravelConfig };
        } else if (fs.existsSync(fromCore)) {
            config = yaml.load(fs.readFileSync(fromCore, "utf8"));
        } else {
            mainWindow.webContents.send("choose-directory", { error: "No valid template file found." });
            return;
        }

        const ensureTrailingSlash = (dir) => {
            const trailingSlash = isWindows ? "\\" : "/";
            return dir.endsWith(trailingSlash) ? dir : dir + trailingSlash;
        };

        config.app = config.app || {};
        config.app.project_path = ensureTrailingSlash(selectedDir);

        fs.writeFileSync(configFilePath, yaml.dump(config), "utf8");

        ipcMain.emit("environment::check", event, {
            applicationPath: selectedDir
        });

        mainWindow.webContents.send("choose-directory", { success: true, path: selectedDir });
    } catch (err) {
        console.log(err)
        mainWindow.webContents.send("choose-directory", { error: err.message });
    }
}

export { chooseDirectory }
