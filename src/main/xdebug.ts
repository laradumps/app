import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import fs from 'fs';
import yaml from 'js-yaml';
import XDebugServer from './xdebug-server';
import { getBreakpoints } from './watcher';

const xdebugServer = XDebugServer.getInstance();

const DEFAULTS = {
    workdir: '',
    project_path: '',
    separator: '/',
    wsl_config: '',
    client_host: '0.0.0.0',
    client_port: 9003
};

export const init = async (mainWindow: BrowserWindow) => {
    ipcMain.on('send-xdebug-command', (event, command) => {
        try {
            xdebugServer.sendCommand(command);
        } catch (error) {
            event.reply('xdebug-error', error.message);
        }
    });

    ipcMain.handle('read-file', (_event, filePath: string) => fs.promises.readFile(filePath, 'utf-8'));

    ipcMain.handle('xdebug:get-breakpoints', () => getBreakpoints());

    ipcMain.on('connect-xdebug', (event) => event.reply('xdebug-connected', true));

    ipcMain.on('disconnect-xdebug', (event) => {
        xdebugServer.closeClient();
        event.reply('xdebug-disconnected');
    });

    ipcMain.on('main:setting-get-xdebug-environments', (event: IpcMainEvent, applicationPath: string): void => {
        try {
            const { app, xdebug } = yaml.load(fs.readFileSync(applicationPath + '/laradumps.yaml', 'utf8')) as any;

            const config = {
                workdir: app.workdir,
                project_path: app.project_path,
                separator: app.separator ?? DEFAULTS.separator,
                wsl_config: app.wsl_config,
                client_host: xdebug?.client_host ?? DEFAULTS.client_host,
                client_port: xdebug?.client_port ?? DEFAULTS.client_port
            };

            xdebugServer.startClient(mainWindow, config);
            event.reply('settings:env-xdebug-file-contents', config);
        } catch (e) {
            console.error(e);
            xdebugServer.startClient(mainWindow, DEFAULTS);
            event.reply('settings:env-xdebug-file-contents');
        }
    });
};
