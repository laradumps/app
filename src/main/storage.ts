import { ipcMain, IpcMainEvent, Notification, BrowserWindow } from 'electron';
import path from 'path';
import Store from 'electron-store';
import yaml from 'js-yaml';
import fs from 'fs';

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

// Centralized IPC channels for consistency across main process
const CHANNELS = {
    STORAGE_GET: 'storage.get',
    STORAGE_GET_REPLY: 'storage.get.reply',
    STORAGE_CHECK: 'storage.check',
    STORAGE_GET_ENVIRONMENTS: 'storage.get-environments',
    STORAGE_GET_ENVIRONMENTS_REPLY: 'storage.get-environments.reply',
    STORAGE_REMOVE: 'storage.remove',
    STORAGE_UPDATE: 'storage.update',
    STORAGE_UPDATE_REPLY: 'storage.update.reply',
    STORAGE_GET_YAML: 'storage.get-yaml',
    STORAGE_GET_YAML_REPLY: 'storage.get-yaml.reply',
    STORAGE_UPDATE_SECTION: 'storage.update-section',
    STORAGE_UPDATE_SECTION_REPLY: 'storage.update-section.reply',
    STORAGE_SET_ENVIRONMENTS_ORDER: 'storage.set-environments-order',
    STORAGE_SET_PROJECTS_ORDER: 'storage.set-projects-order',
    STORAGE_GET_PROJECTS_ORDER: 'storage.get-projects-order',
    STORAGE_GET_APP_URL: 'storage.get-app-url',
    STORAGE_GET_APP_URL_REPLY: 'storage.get-app-url.reply',
    STORAGE_CHECK_PROFILER_DEPS: 'profiler.check-deps',
    STORAGE_CHECK_PROFILER_DEPS_REPLY: 'profiler.check-deps.reply',

    APP_SETTING_PROJECT_ADDED: 'app-setting:project-added',
    STORAGE_SET_ACTIVE_REPLY: 'storage.set-active.reply'
} as const;

export const init = async () => {
    ipcMain.on(CHANNELS.STORAGE_GET, getEnvironments);
    ipcMain.on(CHANNELS.STORAGE_CHECK, checkEnvironment);
    ipcMain.on(CHANNELS.STORAGE_GET_ENVIRONMENTS, getEnvironmentFileContents);
    ipcMain.on(CHANNELS.STORAGE_REMOVE, removeEnvironment);
    ipcMain.on(CHANNELS.STORAGE_UPDATE, updateEnvironment);
    ipcMain.on(CHANNELS.STORAGE_GET_YAML, getFullYaml);
    ipcMain.on(CHANNELS.STORAGE_UPDATE_SECTION, updateYamlSection);
    ipcMain.on(CHANNELS.STORAGE_SET_ENVIRONMENTS_ORDER, setEnvironmentsOrder);
    ipcMain.on(CHANNELS.STORAGE_SET_PROJECTS_ORDER, setProjectsOrder);
    ipcMain.on(CHANNELS.STORAGE_GET_PROJECTS_ORDER, getProjectsOrder);
    ipcMain.on(CHANNELS.STORAGE_GET_APP_URL, getAppUrl);
    ipcMain.on(CHANNELS.STORAGE_CHECK_PROFILER_DEPS, checkProfilerDeps);
};

const getEnvironments = (event: IpcMainEvent) => {
    try {
        const environments = store.get('environments', {});
        event.reply(CHANNELS.STORAGE_GET_REPLY, environments);
    } catch (error) {
        console.error('Error getting storage:', error);
    }
};

const checkEnvironment = (event: IpcMainEvent, payload: { applicationPath: string }) => {
    const store = new Store();
    let applicationPath = payload.applicationPath;

    if (!applicationPath) {
        new Notification({
            title: 'LaraDumps Info',
            body: 'The file: "laradumps.yaml" is not found in the project root'
        }).show();
        return;
    }

    if (applicationPath.endsWith('/')) {
        applicationPath = applicationPath.slice(0, -1);
    }

    const project = path.basename(applicationPath);

    try {
        const environments = store.get('environments', {});
        if (!environments[project]) {
            environments[project] = applicationPath;
            store.set('environments', environments);
            event.reply(CHANNELS.APP_SETTING_PROJECT_ADDED, {
                project,
                path: applicationPath
            });
        }

        setTimeout(
            () =>
                event.reply(CHANNELS.STORAGE_SET_ACTIVE_REPLY, {
                    project,
                    path: applicationPath
                }),
            200
        );
    } catch (error) {
        console.error('Error updating environments in storage:', error);
    }
};

const getEnvironmentFileContents = (event: IpcMainEvent, projectPath: string) => {
    const file = projectPath + '/laradumps.yaml';

    try {
        const readFile: DataStructure = yaml.load(fs.readFileSync(file, 'utf8')) as DataStructure;

        let observers = Object.entries({ ...readFile.observers }).map(([key, val]) => {
            return {
                id: 0,
                value: key,
                name: key.replace(/_/g, ' '),
                selected: Boolean(val)
            } as Environment;
        });

        // Apply persisted order
        try {
            let normalizedPath = projectPath;
            if (normalizedPath.endsWith('/')) normalizedPath = normalizedPath.slice(0, -1);
            const project = path.basename(normalizedPath);
            const orderKey = `env_order.${project}`;
            const savedOrder = store.get(orderKey, [] as any) as string[];
            if (Array.isArray(savedOrder) && savedOrder.length) {
                const indexMap = new Map<string, number>();
                savedOrder.forEach((val, idx) => indexMap.set(val, idx));
                observers.sort((a, b) => {
                    const ai = indexMap.has(a.value) ? (indexMap.get(a.value) as number) : Number.MAX_SAFE_INTEGER;
                    const bi = indexMap.has(b.value) ? (indexMap.get(b.value) as number) : Number.MAX_SAFE_INTEGER;
                    return ai - bi;
                });
            }
        } catch (e) {
            console.error('Error applying saved env order:', e);
        }

        // Reassign incremental ids after ordering
        observers = observers.map((obs, idx) => ({ ...obs, id: idx }));

        event.reply(CHANNELS.STORAGE_GET_ENVIRONMENTS_REPLY, observers);
    } catch (e) {
        console.error(e);
        event.reply(CHANNELS.STORAGE_GET_ENVIRONMENTS_REPLY, []);
    }
};

const removeEnvironment = (_event: IpcMainEvent, projectPath: string) => {
    const store = new Store();

    let applicationPath = projectPath;

    if (applicationPath.endsWith('/')) {
        applicationPath = applicationPath.slice(0, -1);
    }

    const project = path.basename(applicationPath);

    try {
        const environments = store.get('environments', {});
        if (!environments || !environments[project]) {
            console.error(`Project "${project}" not found in environments.`);
            return;
        }

        delete environments[project];

        store.set('environments', environments);

        try {
            const allOrder = store.get('proj_order.all', [] as any) as any[];
            const newAllOrder = Array.isArray(allOrder) ? allOrder.filter((n) => n !== project) : [];
            store.set('proj_order.all', newAllOrder);
        } catch (e) {
            console.error('Error cleaning project from order array', e);
        }

        ipcMain.emit(CHANNELS.STORAGE_GET);

        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            win.webContents.send(
                CHANNELS.STORAGE_GET_PROJECTS_ORDER,
                (store.get('proj_order.all', [] as any) as any[]) || []
            );
        }
    } catch (error) {
        console.error('Error updating storage:', error);
    }
};

const updateEnvironment = (
    _event: IpcMainEvent,
    payload: { selected: Array<{ value: string; selected: boolean }>; path: string }
) => {
    const { selected: selectedEnvs, path } = payload;
    const filePath = `${path}/laradumps.yaml`;

    const yamlLib = require('js-yaml');
    const fsLib = require('fs');

    let data: DataStructure;

    try {
        const fileContents = fsLib.readFileSync(filePath, 'utf8');
        data = yamlLib.load(fileContents);

        selectedEnvs.forEach((item: { value: string; selected: boolean }) => {
            if (!data.observers) data.observers = {} as any;
            data.observers[item.value] = item.selected;
        });

        const yamlData = yamlLib.dump(data);

        fsLib.writeFileSync(filePath, yamlData);
        console.log('laradumps.yaml has been updated successfully.');

        _event.reply(CHANNELS.STORAGE_UPDATE_REPLY);
    } catch (err) {
        console.error(err);
    }
};

const getFullYaml = (event: IpcMainEvent, projectPath: string) => {
    const filePath = `${projectPath}/laradumps.yaml`;
    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(fileContents);
        event.reply(CHANNELS.STORAGE_GET_YAML_REPLY, data || {});
    } catch (err) {
        console.error(err);
        event.reply(CHANNELS.STORAGE_GET_YAML_REPLY, {});
    }
};

const updateYamlSection = (
    event: IpcMainEvent,
    payload: { path: string; section: string; values: Record<string, any> }
) => {
    const { path: projectPath, section, values } = payload;
    const filePath = `${projectPath}/laradumps.yaml`;

    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data: any = yaml.load(fileContents) || {};

        if (!data[section] || typeof data[section] !== 'object') {
            data[section] = {};
        }

        data[section] = { ...data[section], ...values };

        const yamlData = yaml.dump(data);
        fs.writeFileSync(filePath, yamlData);
        event.reply(CHANNELS.STORAGE_UPDATE_SECTION_REPLY, { section, values: data[section] });
    } catch (err) {
        console.error('Error updating section:', err);
        event.reply(CHANNELS.STORAGE_UPDATE_SECTION_REPLY, { section, values: null, error: String(err) });
    }
};

const setEnvironmentsOrder = (_event: IpcMainEvent, payload: { path: string; order: string[] }) => {
    try {
        let normalizedPath = payload.path || '';
        if (normalizedPath.endsWith('/')) normalizedPath = normalizedPath.slice(0, -1);
        const project = path.basename(normalizedPath);
        const orderKey = `env_order.${project}`;
        const arr = Array.isArray(payload.order) ? payload.order : [];
        store.set(orderKey, arr);
    } catch (err) {
        console.error('Error setting environments order:', err);
    }
};

const setProjectsOrder = (_event: IpcMainEvent, payload: string[]) => {
    try {
        const arr = Array.isArray(payload) ? payload : [];
        store.set('proj_order.all', arr);
    } catch (err) {
        console.error('Error setting projects order:', err);
    }
};

const getProjectsOrder = (event: IpcMainEvent) => {
    try {
        const all = store.get('proj_order.all', [] as any) as any;
        event.reply(CHANNELS.STORAGE_GET_PROJECTS_ORDER, Array.isArray(all) ? all : []);
    } catch (err) {
        console.error('Error getting projects order:', err);
        event.reply(CHANNELS.STORAGE_GET_PROJECTS_ORDER, []);
    }
};

const getAppUrl = (event: IpcMainEvent, projectPath: string) => {
    try {
        const envFile = path.join(projectPath, '.env');
        const content = fs.readFileSync(envFile, 'utf8');
        const match = content.match(/^APP_URL\s*=\s*(.*)$/m);
        const appUrl = match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
        event.reply(CHANNELS.STORAGE_GET_APP_URL_REPLY, appUrl);
    } catch (e) {
        event.reply(CHANNELS.STORAGE_GET_APP_URL_REPLY, null);
    }
};

const checkProfilerDeps = (event: IpcMainEvent, projectPath: string) => {
    try {
        const otelInstalled = !!projectPath && fs.existsSync(path.join(projectPath, 'vendor', 'open-telemetry', 'sdk'));
        event.reply(CHANNELS.STORAGE_CHECK_PROFILER_DEPS_REPLY, { otelInstalled });
    } catch (e) {
        event.reply(CHANNELS.STORAGE_CHECK_PROFILER_DEPS_REPLY, { otelInstalled: false });
    }
};
