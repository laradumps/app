import { ipcMain, BrowserWindow, IpcMainEvent } from "electron";
import storage from "electron-json-storage";

interface EnvironmentStorage {
    project: string;
    path: any;
}

function configureEnvironment(mainWindow: BrowserWindow): void {
    ipcMain.on("environment::get", async () => {
        const all = (): Promise<EnvironmentStorage[]> => {
            return new Promise((resolve, reject) => {
                storage.keys((error: Error | null, keys: string[]) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    const projects: EnvironmentStorage[] = [];

                    for (const key of keys) {
                        if (key.startsWith("environment_")) {
                            const project = key.replace("environment_", "");
                            const path = storage.getSync(key);
                            const existingProjectIndex = projects.findIndex((p) => p.project === project);
                            if (existingProjectIndex === -1) {
                                projects.push({ project, path });
                            } else {
                                projects[existingProjectIndex].path = path;
                            }
                        }
                    }

                    resolve(projects);
                });
            });
        };

        const environmentStorages = await all();
        mainWindow.webContents.send("app-setting:set-environment", environmentStorages);
        console.log(environmentStorages);
    });

    ipcMain.on("environment::check", (event: IpcMainEvent, value: { applicationPath: string }): void => {
        let path = value.applicationPath;

        if (path.endsWith("/")) {
            path = path.slice(0, -1);
        }

        const project = path.split("/").pop();

        // Check if the storage key 'environment_' + project exists
        storage.has(`environment_${project}`, (error: Error | null, hasKey: boolean): void => {
            if (error) {
                console.error("Error checking storage:", error);
                return;
            }

            // If the key doesn't exist, add it with the corresponding value
            if (!hasKey) {
                storage.set(`environment_${project}`, path, (error: Error | null): void => {
                    if (error) {
                        console.error("Error setting storage:", error);
                        return;
                    }
                    console.log(`Added environment_${project} to storage with value: ${path}`);
                });
            } else {
                console.log(`environment_${project} already exists in storage.`);
            }

            const storageEnvironment = (): Promise<object> => {
                return new Promise((resolve) => {
                    storage.get(`environment_${project}`, (error: Error | null, data: any) => {
                        if (error) {
                            console.error("Error getting storage:", error);
                            resolve({});
                            return;
                        }
                        resolve(data);
                    });
                });
            };

            storageEnvironment().then(async (storageEnvironment: Object): Promise<void> => {
                ipcMain.emit("environment::get")
                setTimeout(() => mainWindow.webContents.send("app-setting:set-active", storageEnvironment), 200,)
            });
        });
    });

    ipcMain.on("main:setting-get-environments", (event: IpcMainEvent, value: string): void => {
        const file = value + "/laradumps.yaml";

        try {
            const yaml = require("js-yaml");
            const fs = require("fs");

            const readFile = yaml.load(fs.readFileSync(file, "utf8"));

            const parseYaml = Object.entries({ ...readFile.observers }).map(([key, val], index) => {
                return {
                    id: index,
                    value: key,
                    name: key.replace(/_/g, " "),
                    selected: val
                };
            });

            mainWindow.webContents.send("settings:env-file-contents", parseYaml);
        } catch (e) {
            console.error(e);
            mainWindow.webContents.send("settings:env-file-contents", []);
        }
    });

    ipcMain.on("main:setting-remove-environments", (event: IpcMainEvent, value: string): void => {
        let path = value;

        if (path.endsWith("/")) {
            path = path.slice(0, -1);
        }

        const project = path.split("/").pop();

        storage.remove(`environment_${project}`, (error: Error | null) => {
            if (error) {
                console.error("Error removing storage:", error);
            }
            ipcMain.emit("environment::get");
        });
    });
}

export { configureEnvironment };
