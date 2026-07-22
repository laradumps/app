import fs from 'fs';
import path from 'path';

export interface Frame {
    file: string;
    line: number;
    route: string;
    snippet: Record<string, string>;
}

export interface TailIdeHandle {
    workdir: string;
    project_path: string;
    real_path: string;
    line: string;
    class_name: string;
    separator: string;
    wsl_config: string;
    base_path: string;
}

export interface ParsedLog {
    log_id: string;
    level: string;
    context: string[];
    message: string;
    created_at: string;
    original_content: string;
    ide_handle: TailIdeHandle;
    code_snippet: Frame[];
    color: string;
    queries: any[];
    requests: any[];
}

// [2024-01-15 10:30:45] local.ERROR: message ...  (microseconds/timezone optional, uppercase level)
const HEADER =
    /^\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:?\d{2}|Z)?)\]\s+(.+?)\.([A-Z][A-Z_]*):\s?([\s\S]*)$/;

// A leading date-time, optionally wrapped in [ ], used to detect the start of an
// entry in non-Laravel formats (Python `logging`, ISO 8601, etc.). Accepts comma
// or dot fractional seconds and an optional timezone.
const TS_CORE = '\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}:\\d{2}(?:[.,]\\d+)?(?:\\s?[+-]\\d{2}:?\\d{2}|Z)?';
const LEADING_TS = new RegExp(`^\\[?(${TS_CORE})\\]?`);

// Severity keyword → normalized level (Laravel + common Python/generic aliases).
const LEVEL_ALIASES: Record<string, string> = {
    emergency: 'emergency',
    alert: 'alert',
    critical: 'critical',
    crit: 'critical',
    fatal: 'critical',
    error: 'error',
    err: 'error',
    warning: 'warning',
    warn: 'warning',
    notice: 'notice',
    info: 'info',
    information: 'info',
    debug: 'debug',
    trace: 'debug',
    verbose: 'debug'
};
const LEVEL_NAMES =
    'emergency|alert|critical|crit|fatal|error|err|warning|warn|notice|information|info|debug|trace|verbose';
// Prefer an uppercase, delimited level token (how most loggers emit it) so we
// don't pick up a lowercase word from a logger name or the message body.
const LEVEL_UPPER = new RegExp(`\\b(${LEVEL_NAMES.toUpperCase()})\\b`);
const LEVEL_ANY = new RegExp(`\\b(${LEVEL_NAMES})\\b`, 'i');

// (RuntimeException(code: 0): message at /app/Foo.php:42)
const EXC = /\(([\w\\]+)\(code:\s*-?\d+\):\s*([\s\S]*?)\s+at\s+(.+?):(\d+)\)/;

// #0 /path/File.php(123): Class->method()
const FRAME_FILE = /^(.*?)\((\d+)\):\s*([\s\S]*)$/;

const MAX_DISK_FRAMES = 40; // max unique source files read from disk per entry
const MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024;
const KNOWN_ROOTS = 'app|src|vendor|routes|database|config|tests|bootstrap|resources|public';

export function isHeaderLine(line: string): boolean {
    return HEADER.test(line) || LEADING_TS.test(line);
}

function parseColor(level: string): string {
    switch (level) {
        case 'error':
        case 'critical':
        case 'alert':
        case 'emergency':
            return 'red';
        case 'warning':
            return 'orange';
        case 'info':
            return 'blue';
        case 'notice':
            return 'green';
        default:
            return 'gray';
    }
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toIso(ts: string): string {
    // Normalize `2026-06-27 14:36:01,123 +0000` → `2026-06-27T14:36:01.123+0000`.
    const normalized = ts
        .replace(',', '.')
        .replace(' ', 'T')
        .replace(/\s+(?=[+-]\d)/, '');
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/**
 * Parse an entry that isn't in Laravel format but begins with a recognizable
 * timestamp (Python `logging`, ISO, etc.). Returns null when the first line has
 * no leading timestamp so the caller can fall back to a raw debug entry.
 */
function parseGenericEntry(
    lines: string[],
    seq: number,
    projectPath: string,
    raw: string,
    log_id: string
): ParsedLog | null {
    const first = lines[0] ?? '';
    const tsMatch = first.match(LEADING_TS);
    if (!tsMatch) {
        return null;
    }

    const ts = tsMatch[1];
    const afterTs = first.slice(tsMatch[0].length);

    const levelMatch = afterTs.match(LEVEL_UPPER) || afterTs.match(LEVEL_ANY);
    const level = levelMatch ? (LEVEL_ALIASES[levelMatch[1].toLowerCase()] ?? 'info') : 'info';

    // Message = text after the level token when present, otherwise everything
    // after the timestamp. Strip the leading separators loggers use (- : | ]).
    const stripLead = (value: string): string => value.replace(/^[\s:>|\]-]+/, '').trim();
    let message = levelMatch
        ? stripLead(afterTs.slice((levelMatch.index ?? 0) + levelMatch[0].length))
        : stripLead(afterTs);
    if (!message) {
        message = stripLead(afterTs) || first.trim();
    }

    const contextText = lines.slice(1).join('\n');
    const context0 = contextText
        ? `<pre class="text-xs whitespace-pre-wrap break-all">${escapeHtml(contextText)}</pre>`
        : '';

    return {
        log_id,
        level,
        context: [context0, String(seq)],
        message,
        created_at: toIso(ts),
        original_content: raw,
        ide_handle: emptyIdeHandle(projectPath),
        code_snippet: [],
        color: parseColor(level),
        queries: [],
        requests: []
    };
}

function emptyIdeHandle(projectPath: string): TailIdeHandle {
    return {
        workdir: '',
        project_path: projectPath,
        real_path: '',
        line: '',
        class_name: 'empty',
        separator: '/',
        wsl_config: '',
        base_path: ''
    };
}

function resolveFile(file: string, projectPath: string): string | null {
    try {
        if (file && fs.existsSync(file)) {
            return file;
        }
    } catch {
        /* ignore */
    }

    if (projectPath) {
        const match = file.match(new RegExp(`(?:^|/)((?:${KNOWN_ROOTS})/.*)$`));
        if (match) {
            const candidate = path.join(projectPath, match[1]);
            try {
                if (fs.existsSync(candidate)) {
                    return candidate;
                }
            } catch {
                /* ignore */
            }
        }
    }

    return null;
}

async function readSourceLines(
    absFile: string,
    cache: Map<string, string[] | null>
): Promise<string[] | null> {
    if (cache.has(absFile)) {
        return cache.get(absFile) ?? null;
    }

    let lines: string[] | null = null;
    try {
        const stat = await fs.promises.stat(absFile);
        if (stat.isFile() && stat.size <= MAX_SOURCE_FILE_BYTES) {
            lines = (await fs.promises.readFile(absFile, 'utf8')).split('\n');
        }
    } catch {
        lines = null;
    }

    cache.set(absFile, lines);
    return lines;
}

async function buildSnippet(
    absFile: string,
    line: number,
    cache: Map<string, string[] | null>
): Promise<Record<string, string> | null> {
    const lines = await readSourceLines(absFile, cache);
    if (!lines) {
        return null;
    }

    const from = Math.max(1, line - 5);
    const to = Math.min(lines.length, line + 5);
    const snippet: Record<string, string> = {};
    for (let i = from; i <= to; i++) {
        snippet[String(i)] = lines[i - 1] ?? '';
    }
    return snippet;
}

async function parseFrames(entryLines: string[], projectPath: string): Promise<Frame[]> {
    const frameLines = entryLines.filter((line) => /^#\d+\s/.test(line.trim()));
    const cache = new Map<string, string[] | null>();
    const frames: Frame[] = [];
    let diskReads = 0;

    for (const raw of frameLines) {
        const trimmed = raw.trim();
        const numMatch = trimmed.match(/^#(\d+)\s+([\s\S]*)$/);
        if (!numMatch) {
            continue;
        }

        const index = numMatch[1];
        const rest = numMatch[2];
        const fileMatch = rest.match(FRAME_FILE);

        if (fileMatch) {
            const file = fileMatch[1].trim();
            const line = parseInt(fileMatch[2], 10) || 0;
            const call = fileMatch[3].trim();

            let snippet: Record<string, string> | null = null;
            const resolved = resolveFile(file, projectPath);
            if (resolved) {
                const alreadyCached = cache.has(resolved);
                if (alreadyCached || diskReads < MAX_DISK_FRAMES) {
                    snippet = await buildSnippet(resolved, line, cache);
                    if (snippet && !alreadyCached) {
                        diskReads++;
                    }
                }
            }

            if (snippet) {
                frames.push({ file, line, route: `${file}:${line}`, snippet });
            } else {
                frames.push({
                    file,
                    line,
                    route: `#${index} ${file}:${line}`,
                    snippet: { [String(line)]: call }
                });
            }
        } else {
            frames.push({ file: '', line: 0, route: `#${index} ${rest}`, snippet: { '0': rest } });
        }
    }

    return frames;
}

export async function parseEntry(lines: string[], seq: number, projectPath: string): Promise<ParsedLog> {
    const raw = lines.join('\n');
    const log_id = `tail_${seq}`;
    const headerMatch = lines[0]?.match(HEADER);

    if (!headerMatch) {
        const generic = parseGenericEntry(lines, seq, projectPath, raw, log_id);
        if (generic) {
            return generic;
        }

        return {
            log_id,
            level: 'debug',
            context: ['', String(seq)],
            message: (lines[0] ?? raw).trim(),
            created_at: new Date().toISOString(),
            original_content: raw,
            ide_handle: emptyIdeHandle(projectPath),
            code_snippet: [],
            color: 'gray',
            queries: [],
            requests: []
        };
    }

    const ts = headerMatch[1];
    const levelUpper = headerMatch[3];
    const restHead = headerMatch[4];
    const level = levelUpper.toLowerCase();

    // The trailing context is a JSON object that starts with {" on the header line
    // (e.g. {"userId":3,"exception":"..."}); everything before it is the human message.
    let message = '';
    let contextBlock = '';
    const jsonStart = restHead.indexOf('{"');
    if (jsonStart >= 0) {
        message = restHead.slice(0, jsonStart).trim();
        contextBlock = [restHead.slice(jsonStart), ...lines.slice(1)].join('\n');
    } else {
        message = restHead.replace(/\s*\[\]\s*$/, '').trim();
        contextBlock = lines.slice(1).join('\n');
    }

    const exc = contextBlock.match(EXC) || restHead.match(EXC);
    let excFile = '';
    let excLine = 0;
    let excClass = '';
    if (exc) {
        excClass = exc[1];
        excFile = exc[3];
        excLine = parseInt(exc[4], 10) || 0;
    }
    if (!message) {
        message = exc ? `${excClass}: ${exc[2].trim()}`.trim() : restHead.trim();
    }

    const code_snippet = await parseFrames(lines, projectPath);
    const firstFrameWithFile = code_snippet.find((frame) => frame.file);

    const ide_handle: TailIdeHandle = {
        workdir: '',
        project_path: projectPath,
        real_path: excFile || firstFrameWithFile?.file || '',
        line: String(excLine || firstFrameWithFile?.line || ''),
        class_name: excFile
            ? path.basename(excFile)
            : firstFrameWithFile
              ? path.basename(firstFrameWithFile.file)
              : 'empty',
        separator: '/',
        wsl_config: '',
        base_path: ''
    };

    const context0 =
        code_snippet.length === 0 && contextBlock
            ? `<pre class="text-xs whitespace-pre-wrap break-all">${escapeHtml(contextBlock)}</pre>`
            : '';

    return {
        log_id,
        level,
        context: [context0, String(seq)],
        message,
        created_at: toIso(ts),
        original_content: raw,
        ide_handle,
        code_snippet,
        color: parseColor(level),
        queries: [],
        requests: []
    };
}
