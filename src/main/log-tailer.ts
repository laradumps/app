import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import * as settings from './settings';
import { isHeaderLine, parseEntry, ParsedLog } from './log-parser';

const FLUSH_IDLE_MS = 300;
const MAX_PENDING_BUFFER = 1024 * 1024;

const LOG_SCAN_MAX_DEPTH = 6;
const LOG_SCAN_MAX_RESULTS = 500;
const LOG_SCAN_IGNORE_DIRS = new Set([
    'node_modules',
    'vendor',
    '.git',
    '.svn',
    '.hg',
    'dist',
    'build',
    'out',
    '.next',
    '.nuxt',
    '.cache',
    'coverage',
    '.idea',
    '.vscode',
    'Pods',
    'DerivedData'
]);

export interface DiscoveredLog {
    path: string;
    name: string;
    dir: string;
    size: number;
    mtimeMs: number;
}

let mainWindow: BrowserWindow | null = null;
let watcher: ReturnType<typeof chokidar.watch> | null = null;
let logsDir: string | null = null;
let filePath: string | null = null;
let projectPath = '';
let lastOffset = 0;
let pendingBuffer = '';
let currentEntryLines: string[] = [];
let currentEntryId = -1;
let reading = false;
let flushTimer: NodeJS.Timeout | null = null;
let seq = 0;

function maxBytes(): number {
    const mb = Number(settings.getSettings().tail_log_max_size_mb ?? 25);
    return (isNaN(mb) || mb <= 0 ? 25 : mb) * 1024 * 1024;
}

/**
 * Resolve the log file to tail for a project. Prefers `laravel.log`, but falls
 * back to the most recently modified `*.log` in `storage/logs` so projects that
 * use daily logs (`laravel-YYYY-MM-DD.log`) work out of the box.
 */
function resolveDefaultLogFile(proj: string): string {
    const logsDir = path.join(proj, 'storage', 'logs');
    const preferred = path.join(logsDir, 'laravel.log');

    try {
        if (fs.existsSync(preferred)) {
            return preferred;
        }
    } catch {
        /* ignore */
    }

    try {
        const newest = fs
            .readdirSync(logsDir)
            .filter((name) => name.endsWith('.log'))
            .map((name) => {
                const full = path.join(logsDir, name);
                let mtime = 0;
                try {
                    mtime = fs.statSync(full).mtimeMs;
                } catch {
                    /* ignore */
                }
                return { full, mtime };
            })
            .sort((a, b) => b.mtime - a.mtime)[0];

        if (newest) {
            return newest.full;
        }
    } catch {
        /* ignore */
    }

    return preferred;
}

async function discoverLogFiles(baseDir: string): Promise<DiscoveredLog[]> {
    const results: DiscoveredLog[] = [];
    const queue: Array<{ dir: string; depth: number }> = [{ dir: baseDir, depth: 0 }];

    while (queue.length > 0 && results.length < LOG_SCAN_MAX_RESULTS) {
        const { dir, depth } = queue.shift()!;

        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const entry of entries) {
            const full = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (depth >= LOG_SCAN_MAX_DEPTH) continue;
                if (entry.name.startsWith('.')) continue;
                if (LOG_SCAN_IGNORE_DIRS.has(entry.name)) continue;
                queue.push({ dir: full, depth: depth + 1 });
            } else if (entry.isFile() && entry.name.endsWith('.log')) {
                try {
                    const st = await fs.promises.stat(full);
                    results.push({ path: full, name: entry.name, dir, size: st.size, mtimeMs: st.mtimeMs });
                } catch {
                    /* ignore unreadable file */
                }
                if (results.length >= LOG_SCAN_MAX_RESULTS) break;
            }
        }
    }

    results.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return results;
}

function send(channel: string, payload: Record<string, any> | ParsedLog[] = {}): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}

async function buildCurrentEntry(): Promise<ParsedLog | null> {
    if (currentEntryLines.length === 0) {
        return null;
    }
    return parseEntry(currentEntryLines, currentEntryId, projectPath);
}

function scheduleIdleFlush(): void {
    if (flushTimer) {
        clearTimeout(flushTimer);
    }
    flushTimer = setTimeout(async () => {
        const entry = await buildCurrentEntry();
        if (entry) {
            send('tail-log:entries', [entry]);
        }
    }, FLUSH_IDLE_MS);
}

async function feedLines(lines: string[]): Promise<void> {
    const batch: ParsedLog[] = [];

    for (const line of lines) {
        if (isHeaderLine(line)) {
            const finalized = await buildCurrentEntry();
            if (finalized) {
                batch.push(finalized);
            }
            currentEntryLines = [line];
            currentEntryId = seq++;
        } else if (currentEntryLines.length > 0) {
            currentEntryLines.push(line);
        }
    }

    if (batch.length > 0) {
        send('tail-log:entries', batch);
    }
    scheduleIdleFlush();
}

function readRange(start: number, end: number): Promise<void> {
    return new Promise((resolve) => {
        if (!filePath || end <= start) {
            return resolve();
        }

        const stream = fs.createReadStream(filePath, { start, end: end - 1, encoding: 'utf8' });
        let chunk = '';

        stream.on('data', (data) => {
            chunk += data;
        });
        stream.on('error', (error: any) => {
            send('tail-log:error', { code: error?.code || 'EREAD', message: String(error) });
            resolve();
        });
        stream.on('close', async () => {
            pendingBuffer += chunk;
            if (pendingBuffer.length > MAX_PENDING_BUFFER) {
                pendingBuffer = pendingBuffer.slice(-MAX_PENDING_BUFFER);
            }
            const parts = pendingBuffer.split('\n');
            pendingBuffer = parts.pop() ?? '';
            await feedLines(parts);
            resolve();
        });
    });
}

async function onChange(): Promise<void> {
    if (reading || !filePath) {
        return;
    }
    reading = true;

    try {
        const { size } = await fs.promises.stat(filePath);

        if (size < lastOffset) {
            pendingBuffer = '';
            currentEntryLines = [];
            currentEntryId = -1;
            send('tail-log:reset');
            await readRange(Math.max(0, size - maxBytes()), size);
        } else if (size > lastOffset) {
            await readRange(lastOffset, size);
        }

        lastOffset = size;
        send('tail-log:meta', { filePath, size, truncated: false, watching: true, exists: true });
    } catch (error: any) {
        send('tail-log:error', { code: error?.code || 'ESTAT', message: String(error) });
    } finally {
        reading = false;
    }
}

async function stop(): Promise<void> {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (watcher) {
        try {
            await watcher.close();
        } catch {
            /* ignore */
        }
        watcher = null;
    }
    filePath = null;
    logsDir = null;
    lastOffset = 0;
    pendingBuffer = '';
    currentEntryLines = [];
    currentEntryId = -1;
    reading = false;
}

async function beginTail(fp: string, clearStore: boolean): Promise<void> {
    filePath = fp;
    pendingBuffer = '';
    currentEntryLines = [];
    currentEntryId = -1;

    if (clearStore) {
        send('tail-log:reset');
    }

    let size = 0;
    let exists = true;
    try {
        size = (await fs.promises.stat(fp)).size;
    } catch (error: any) {
        exists = false;
        send('tail-log:error', { code: error?.code || 'ENOENT', message: `Cannot read ${fp}` });
    }

    const startPos = exists ? Math.max(0, size - maxBytes()) : 0;
    if (exists && size > 0) {
        await readRange(startPos, size);
    }
    lastOffset = exists ? size : 0;

    send('tail-log:meta', { filePath: fp, size, truncated: startPos > 0, watching: true, exists });
}

async function onDirEvent(changedPath: string): Promise<void> {
    if (!changedPath.endsWith('.log')) {
        return;
    }

    if (changedPath === filePath) {
        await onChange();
        return;
    }

    if (reading) {
        return;
    }

    let changedMtime = 0;
    try {
        changedMtime = (await fs.promises.stat(changedPath)).mtimeMs;
    } catch {
        return;
    }

    let activeMtime = -1;
    if (filePath) {
        try {
            activeMtime = (await fs.promises.stat(filePath)).mtimeMs;
        } catch {
            activeMtime = -1;
        }
    }

    if (changedMtime >= activeMtime) {
        reading = true;
        try {
            await beginTail(changedPath, false);
        } finally {
            reading = false;
        }
    }
}

async function start(requestedPath?: string, requestedProject?: string): Promise<void> {
    await stop();

    projectPath = requestedProject || '';

    if (requestedPath) {
        logsDir = null;
        await beginTail(requestedPath, true);
        watcher = chokidar.watch(requestedPath, {
            ignoreInitial: true,
            awaitWriteFinish: { stabilityThreshold: 120, pollInterval: 40 }
        });
        watcher.on('change', onChange);
        watcher.on('add', onChange);
        return;
    }

    if (projectPath) {
        logsDir = path.join(projectPath, 'storage', 'logs');
        await beginTail(resolveDefaultLogFile(projectPath), true);
        watcher = chokidar.watch(logsDir, {
            ignoreInitial: true,
            depth: 0,
            awaitWriteFinish: { stabilityThreshold: 120, pollInterval: 40 }
        });
        watcher.on('add', onDirEvent);
        watcher.on('change', onDirEvent);
        return;
    }

    send('tail-log:error', { code: 'ENOPATH', message: 'No log file selected.' });
}

export const init = async (window: BrowserWindow): Promise<void> => {
    mainWindow = window;

    ipcMain.on('tail-log:start', (_event, args) => {
        start(args?.filePath, args?.projectPath);
    });

    ipcMain.on('tail-log:stop', () => {
        stop();
        send('tail-log:meta', { watching: false });
    });

    ipcMain.on('tail-log:clear-file', async () => {
        if (!filePath) {
            send('tail-log:error', { code: 'ENOFILE', message: 'No log file is being tailed.' });
            return;
        }

        const target = filePath;
        const name = path.basename(target);

        const choice = dialog.showMessageBoxSync(window, {
            type: 'warning',
            buttons: ['Clear', 'Cancel'],
            defaultId: 0,
            cancelId: 1,
            title: 'LaraDumps',
            message: `Clear "${name}"?`,
            detail: `This empties the contents of the log file. The file itself is not deleted.\n\n${target}`
        });

        if (choice !== 0) {
            return;
        }

        try {
            await fs.promises.truncate(target, 0);
            lastOffset = 0;
            pendingBuffer = '';
            currentEntryLines = [];
            currentEntryId = -1;
            send('tail-log:reset');
            send('tail-log:meta', { filePath: target, size: 0, truncated: false, watching: !!watcher, exists: true });
        } catch (error: any) {
            send('tail-log:error', {
                code: error?.code || 'ECLEAR',
                message: `Cannot clear ${target}: ${error?.message || error}`
            });
        }
    });

    ipcMain.handle('tail-log:list-files', async (_event, args) => {
        const base = args?.projectPath || '';

        if (!base) {
            return [];
        }

        try {
            const st = await fs.promises.stat(base);
            if (!st.isDirectory()) {
                return [];
            }
        } catch {
            return [];
        }

        return discoverLogFiles(base);
    });

    ipcMain.on('tail-log:pick-file', async () => {
        const result = await dialog.showOpenDialog(window, {
            properties: ['openFile'],
            filters: [
                { name: 'Log files', extensions: ['log', 'txt'] },
                { name: 'All files', extensions: ['*'] }
            ]
        });

        if (!result.canceled && result.filePaths[0]) {
            send('tail-log:file-picked', { filePath: result.filePaths[0] });
        }
    });

    window.on('close', () => {
        stop();
    });
};
