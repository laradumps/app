import { BrowserWindow, ipcMain, IpcMainEvent, Notification } from "electron";
import path from "path";
import Store from "electron-store";

const store = new Store();

interface DataStructure {
    app: {
        primary_host: string;
        secondary_host: string;
        port: number;
        workdir: string;
        project_path: string;
    };
    config: {
        auto_clear_on_page_reload: boolean;
        auto_invoke_app: boolean;
        theme: string;
        sleep: number;
        color_in_screen: boolean;
        docker: boolean;
    };
    observers: {
        [key: string]: boolean;
    };
}

export const init = async (mainWindow: BrowserWindow) => {
    ipcMain.on("environment::get", async () => {
        try {
            const environments = store.get("environments", {});
            mainWindow.webContents.send("app-setting:set-environment", environments);
        } catch (error) {
            console.error("Error getting storage:", error);
        }
    });

    ipcMain.on("environment::check", (event, value) => {
        let applicationPath = value.applicationPath;

        if (!applicationPath) {
            new Notification({
                title: "LaraDumps Info",
                body: 'The file: "laradumps.yaml" is not found in the project root'
            }).show();
            return;
        }

        if (applicationPath.endsWith("/")) {
            applicationPath = applicationPath.slice(0, -1);
        }

        const project = path.basename(applicationPath);

        try {
            const environments = store.get("environments", {});
            if (!environments[project]) {
                environments[project] = applicationPath;
                store.set("environments", environments);
                mainWindow.webContents.send("app-setting:project-added");
            }

            ipcMain.emit("environment::get");

            setTimeout(() => mainWindow.webContents.send("app-setting:set-active", environments[project]), 200);
        } catch (error) {
            console.error("Error updating environments in storage:", error);
        }
    });

    ipcMain.on("main:setting-get-environments", (event: IpcMainEvent, applicationPath: string): void => {
        const file = applicationPath + "/laradumps.yaml";

        const environments = store.get("environments", {});

        const projectName = Object.entries(environments).find(([key, value]) => value === applicationPath)?.[0];

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

            mainWindow.webContents.send("settings:env-file-contents", {
                projectName,
                environmentYmlList: parseYaml
            });
        } catch (e) {
            console.error(e);
            mainWindow.webContents.send("settings:env-file-contents", {
                projectName,
                environmentYmlList: {}
            });
        }
    });

    ipcMain.on("main:setting-remove-environments", (event, value) => {
        let applicationPath = value;

        if (applicationPath.endsWith("/")) {
            applicationPath = applicationPath.slice(0, -1);
        }

        const project = path.basename(applicationPath);

        try {
            const environments = store.get("environments", {});
            if (!environments || !environments[project]) {
                console.error(`Project "${project}" not found in environments.`);
                return;
            }

            delete environments[project];
            store.set("environments", environments);
            ipcMain.emit("environment::get");
        } catch (error) {
            console.error("Error updating storage:", error);
        }
    });

    ipcMain.on("main:settings-update-environment", (event: Electron.IpcMainEvent, value): void => {
        const { selected, project } = value;
        const filePath = `${project}/laradumps.yaml`;

        const yaml = require("js-yaml");
        const fs = require("fs");

        let data: DataStructure;

        try {
            const fileContents = fs.readFileSync(filePath, "utf8");
            data = yaml.load(fileContents);

            selected.forEach((item: { value: string; selected: boolean }) => {
                data.observers[item.value] = item.selected;
            });

            const yamlData = yaml.dump(data);

            fs.writeFile(filePath, yamlData, (err: NodeJS.ErrnoException | null): void => {
                if (err) {
                    console.error("Error writing to file:", err);
                    return;
                }
                console.log("laradumps.yaml has been updated successfully.");
            });
        } catch (err) {
            console.error(err);
        }
    });
};
