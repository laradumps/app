import { ipcMain, IpcMainEvent, Notification } from "electron";
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
    [key: string]: any;
}

export interface Environment {
    id: number;
    value: string;
    selected: boolean;
}

const store = new Store();

export const init = async () => {
    ipcMain.on("storage.get", getEnvironments);
    ipcMain.on("storage.check", checkEnvironment);
    ipcMain.on("storage.get-environments", getEnvironmentFileContents);
    ipcMain.on("storage.remove", removeEnvironment);
    ipcMain.on("storage.update", updateEnvironment);
    ipcMain.on("storage.get-yaml", getFullYaml);
    ipcMain.on("storage.update-section", updateYamlSection);
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
        const readFile: DataStructure = yaml.load(fs.readFileSync(file, "utf8")) as DataStructure;

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

const updateEnvironment = (event: IpcMainEvent, value: { selected: any[]; path: string }) => {
    const { selected, path } = value;
    const filePath = `${path}/laradumps.yaml`;

    const yamlLib = require("js-yaml");
    const fsLib = require("fs");

    let data: DataStructure;

    try {
        const fileContents = fsLib.readFileSync(filePath, "utf8");
        data = yamlLib.load(fileContents);

        selected.forEach((item: { value: string; selected: boolean }) => {
            if (!data.observers) data.observers = {} as any;
            data.observers[item.value] = item.selected;
        });

        const yamlData = yamlLib.dump(data);

        fsLib.writeFile(filePath, yamlData, (err: NodeJS.ErrnoException | null): void => {
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

const getFullYaml = (event: IpcMainEvent, projectPath: string) => {
    const filePath = `${projectPath}/laradumps.yaml`;
    try {
        const fileContents = fs.readFileSync(filePath, "utf8");
        const data = yaml.load(fileContents);
        event.reply("storage.get-yaml.reply", data || {});
    } catch (err) {
        console.error(err);
        event.reply("storage.get-yaml.reply", {});
    }
};

const updateYamlSection = (event: IpcMainEvent, payload: { path: string; section: string; values: Record<string, any> }) => {
    const { path: projectPath, section, values } = payload;
    const filePath = `${projectPath}/laradumps.yaml`;

    try {
        const fileContents = fs.readFileSync(filePath, "utf8");
        const data: any = yaml.load(fileContents) || {};

        if (!data[section] || typeof data[section] !== "object") {
            data[section] = {};
        }

        data[section] = { ...data[section], ...values };

        const yamlData = yaml.dump(data);
        fs.writeFileSync(filePath, yamlData);
        event.reply("storage.update-section.reply", { section, values: data[section] });
    } catch (err) {
        console.error("Error updating section:", err);
        event.reply("storage.update-section.reply", { section, values: null, error: String(err) });
    }
};
