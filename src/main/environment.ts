import { dialog, ipcMain } from "electron";
import fs from "fs";
import dotenv from "dotenv";
import storage from "electron-json-storage";

interface EnvironmentFile {
    value: string;
    selected: string;
}

let projectExists = false;

function configureEnvironment(mainWindow: Electron.BrowserWindow): void {
    /**
     * Clears the environment storage.
     */
    ipcMain.on("main:settings-clear-all-settings", (): void => {
        storage.clear((error) => {
            if (error) {
                console.log(error);
            }
        });
    });

    /**
     * Updates the environment file with the selected environment variables.
     * @param event - The Electron.IpcMainEvent instance.
     * @param value - The value containing the file and selected environment variables.
     */
    ipcMain.on("main:settings-update-environment", (event: Electron.IpcMainEvent, value): void => {
        const file = value.file;
        const selected: EnvironmentFile = value.selected;
        const selectedIdeHandler = value.selectedIdeHandler;
        const projectPath = value.projectPath;

        const storageEnvironment = async (): Promise<object> => await storage.getSync("environment");

        storageEnvironment().then((storageEnvironment: any): void => {
            const exists = Array.from(storageEnvironment).filter((environment: any): boolean => environment.envFile === file);

            if (exists.length > 0 && value.create) {
                mainWindow.webContents.send("main:search-environment-by-path");
                projectExists = true;

                return;
            }

            projectExists = false;

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const editDotenv = require("edit-dotenv");

            fs.readFile(file, "utf8", (err, data) => {
                if (err) {
                    console.log(err);
                    mainWindow.webContents.send("app-setting:env-update-environment-file-not-exists");
                    return;
                }

                const changes = {};

                // @ts-ignore
                for (const key of selected) {
                    const value = key.text ?? key.value;
                    changes[key.value] = key.selected?.toString() ?? value.toString();
                }

                if (selectedIdeHandler !== undefined) {
                    changes["DS_FILE_HANDLER"] = selectedIdeHandler;
                }
                if (projectPath !== undefined) {
                    changes["DS_PROJECT_PATH"] = projectPath;
                }

                const newFile = editDotenv(data, changes);

                fs.writeFileSync(file, newFile, "utf-8");
            });
        });

        mainWindow.webContents.send("app-setting:env-update-environment-success");
    });

    /**
     * Removes the specified environment file from storage.
     * @param event - The Electron.IpcMainEvent instance.
     * @param value - The environment file to be removed.
     */
    ipcMain.on("main:setting-remove-environments", (event: Electron.IpcMainEvent, value): void => {
        const storageEnvironment = async (): Promise<object> => await storage.getSync("environment");

        storageEnvironment().then(async (storageEnvironment: any): Promise<void> => {
            const updatedEnvironment = storageEnvironment.filter((environment: any): boolean => {
                return environment.envFile !== value;
            });

            // @ts-ignore
            storage.set(`environment`, updatedEnvironment);
        });
    });

    /**
     * Retrieves the contents of the specified environment file and sends them to the mainWindow.
     * @param event - The Electron.IpcMainEvent instance.
     * @param value - The environment file path.
     */
    ipcMain.on("main:setting-get-environments", (event: Electron.IpcMainEvent, value: string): void => {
        const file = value;

        if (file.toString() == "") {
            return;
        }

        // eslint-disable-next-line no-console
        console.log("get environment file: " + file);

        try {
            const env: Buffer = fs.readFileSync(file);
            const buf: Buffer = Buffer.from(env);
            const currentConfig: dotenv.DotenvParseOutput = dotenv.parse(buf);

            dotenv.config({ path: file });

            const envContents = Object.entries({ ...currentConfig })
                .filter(([key, val]) => key.includes("DS_") && (val.includes("true") || val.includes("false")))
                .map(([key, val], index) => {
                    return {
                        id: index,
                        value: key,
                        name: key.replace("DS_", "").replace("SEND", "").replaceAll("_", " "),
                        selected: val
                    };
                });

            mainWindow.webContents.send("settings:env-file-contents", envContents);
        } catch (error) {
            console.log(error);
        }
    });

    /**
     * Opens a file dialog for choosing an environment file.
     */
    ipcMain.on("main:choose-environment-file", () => {
        dialog
            .showOpenDialog(mainWindow, {
                properties: ["openFile", "showHiddenFiles"]
            })
            .then((result) => {
                mainWindow.webContents.send("app-setting:env-file", result.filePaths[0]);
            })
            .catch((err) => {
                console.log(err);
            });
    });

    /**
     * Saves the environment settings to storage.
     * @param event - The Electron.IpcMainEvent instance.
     * @param arg - The environment settings to be saved.
     */
    ipcMain.on("main:store-config", (event: Electron.IpcMainEvent, arg): void => {
        const storageEnvironment = () => storage.getSync("environment");

        if (projectExists) {
            return;
        }

        if (Object.values(storageEnvironment()).length > 0) {
            // @ts-ignore
            storage.set(`environment`, [arg].concat(storageEnvironment()));

            return;
        }

        // @ts-ignore
        storage.set(`environment`, [arg]);

        mainWindow.webContents.send("installer:close-modal");
    });

    /**
     * Retrieves the environment settings from storage and sends them to the mainWindow.
     */
    ipcMain.on("main:get-environment", (): void => {
        // @ts-ignore
        const storageEnvironment = async (): Promise<object> => await storage.getSync("environment");

        storageEnvironment().then((storageEnvironment): void => {
            mainWindow.webContents.send("app-setting:set-environment", Object.values(storageEnvironment).length > 0 ? storageEnvironment : []);
        });
    });
}

export { configureEnvironment };
