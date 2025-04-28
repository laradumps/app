import { app, ipcMain, IpcMainEvent, Notification } from "electron";
import path from "path";
import Store from "electron-store";
import yaml from "js-yaml";
import fs from "fs";
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

const store = new Store();

export const init = async () => {
    ipcMain.on("storage.get", getEnvironments);
    ipcMain.on("storage.check", checkEnvironment);
    ipcMain.on("storage.get-environments", getEnvironmentFileContents);
    ipcMain.on("storage.remove", removeEnvironment);
    ipcMain.on("storage.update", updateEnvironment);
};

const getEnvironments = (event) => {
    try {
        const environments = store.get("environments", {});
        event.reply("storage.get.reply", environments);
    } catch (error) {
        console.error("Error getting storage:", error);
    }
};

const checkEnvironment = (event, value) => {
    const store = new Store();
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
            event.reply("app-setting:project-added", {
                project,
                path: applicationPath
            });
        }

        setTimeout(
            () =>
                event.reply("storage.set-active.reply", {
                    project,
                    path: applicationPath
                }),
            200
        );
    } catch (error) {
        console.error("Error updating environments in storage:", error);
    }
};

const getEnvironmentFileContents = (event: IpcMainEvent, value: string) => {
    const file = value + "/laradumps.yaml";

    try {
        const readFile = yaml.load(fs.readFileSync(file, "utf8"));

        const parseYaml = Object.entries({ ...readFile.observers }).map(([key, val], index) => {
            return {
                id: index,
                value: key,
                name: key.replace(/_/g, " "),
                selected: val
            };
        });

        event.reply("storage.get-environments.reply", parseYaml);
    } catch (e) {
        console.error(e);
        event.reply("storage.get-environments.reply", []);
    }
};

const removeEnvironment = (event: IpcMainEvent, value: string) => {
    const store = new Store();

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
        ipcMain.emit("storage.get");
    } catch (error) {
        console.error("Error updating storage:", error);
    }
};

const updateEnvironment = (event: IpcMainEvent, value: { selected: any[]; project: string }) => {
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
};
