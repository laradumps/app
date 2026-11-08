import chokidar, { type FSWatcher } from 'chokidar';
import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';
import { BrowserWindow } from 'electron';
import { Breakpoint } from '@/types/XDebug';

let breakpoints: Breakpoint[] = [];
let watcher: FSWatcher | null = null;

function readPhpStormBreakpoints(projectPath: string, workspacePath: string): Promise<Breakpoint[]> {
    return new Promise((resolve) => {
        fs.readFile(workspacePath, (err, data) => {
            if (err) return resolve([]);

            xml2js.parseString(data, (err, result) => {
                if (err) return resolve([]);

                try {
                    const components = result.project.component;
                    const debuggerManager = components.find(
                        (component: any) => component.$.name === 'XDebuggerManager'
                    );

                    if (!debuggerManager || !debuggerManager['breakpoint-manager']) {
                        return resolve([]);
                    }

                    const breakpointManager = debuggerManager['breakpoint-manager'][0];
                    const breakpointsList = breakpointManager.breakpoints[0]['line-breakpoint'];

                    const parsedBreakpoints: Breakpoint[] = breakpointsList
                        .map((bp: any) => ({
                            url: bp.url[0].replace('$PROJECT_DIR$', projectPath.replace(/\/$/, '')),
                            line: bp.line ? parseInt(bp.line[0]) + 1 : null,
                            enabled: bp.$.enabled === 'true'
                        }))
                        .filter((bp: any) => bp.enabled && bp.line !== null);

                    resolve(parsedBreakpoints);
                } catch {
                    resolve([]);
                }
            });
        });
    });
}

async function readBreakpointsFromAllSources(
    mainWindow: BrowserWindow,
    projectPath: string,
    workspacePath: string
): Promise<void> {
    breakpoints = await readPhpStormBreakpoints(projectPath, workspacePath);

    mainWindow.webContents.send('xdebug-breakpoints', breakpoints);
}

export const watcherPath = async (mainWindow: BrowserWindow, projectPath: string) => {
    await watcher?.close();
    watcher = null;

    if (!projectPath) {
        breakpoints = [];
        mainWindow.webContents.send('xdebug-breakpoints', breakpoints);
        return;
    }

    const workspacePath = path.join(projectPath, '.idea', 'workspace.xml');
    await readBreakpointsFromAllSources(mainWindow, projectPath, workspacePath);

    watcher = chokidar.watch(workspacePath).on('change', () => {
        readBreakpointsFromAllSources(mainWindow, projectPath, workspacePath);
    });
};

export const getBreakpoints = () => breakpoints;
