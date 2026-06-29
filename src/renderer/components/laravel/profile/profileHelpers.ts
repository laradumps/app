import type { ProfileEntry } from '@/store/profile';

// Bar/dot colors per entry type
export const typeColors: Record<string, string> = {
    app: 'bg-blue-600',
    event: 'bg-green-400',
    sql: 'bg-orange-500',
    eloquent: 'bg-orange-400',
    view: 'bg-emerald-600',
    controller: 'bg-cyan-500',
    http: 'bg-purple-500',
    cache: 'bg-yellow-500',
    job: 'bg-pink-500',
    method: 'bg-blue-500'
};

export const typeLabels: Record<string, string> = {
    app: 'App',
    event: 'Events',
    sql: 'SQL',
    eloquent: 'Eloquent',
    view: 'View',
    controller: 'Controller',
    http: 'HTTP',
    cache: 'Cache',
    job: 'Jobs',
    method: 'Method'
};

export const entryBarColor = (entry: ProfileEntry): string => {
    if (entry.type === 'app' && (entry.name === 'app(start)' || entry.name === 'app(end)')) {
        return 'bg-base-content/20';
    }
    return `${typeColors[entry.type]} hover:opacity-80`;
};

export const legendDotColor = (type: string): string => {
    if (type === 'app') return 'bg-base-content/20';
    return typeColors[type] || 'bg-gray-400';
};

export const formatDuration = (ms: number | null): string => {
    if (ms === null) return '-';
    if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
};

// Extract the separator and parts from a XHProf function string.
// e.g. "App\Models\Campaign::bootSoftDeletes" → sep="::", class="App\Models\Campaign", method="bootSoftDeletes"
export const parseFn = (fn: string): { sep: string; className: string; method: string } | null => {
    const sep = fn.includes('::') ? '::' : fn.includes('->') ? '->' : null;
    if (!sep) return null;
    const idx = fn.indexOf(sep);
    return { sep, className: fn.slice(0, idx), method: fn.slice(idx + sep.length) };
};

// Short class name (last segment after \)
export const shortClass = (className: string): string => className.split('\\').pop() ?? className;

// Short method name: strip any namespace inside the method part (e.g. closures like App\...\{closure})
export const shortMethod = (method: string): string => method.split('\\').pop() ?? method;

// Full label shown in the row when NOT inside a class group (standalone method or non-method entry)
export const entryLabel = (entry: ProfileEntry): string => {
    if (entry.type === 'method' && entry.metadata?.function) {
        const parsed = parseFn(entry.metadata.function as string);
        if (parsed) {
            return `${shortClass(parsed.className)}${parsed.sep}${shortMethod(parsed.method)}`;
        }
    }
    return entry.name;
};

// Extract class name from a method entry (for grouping header)
export const entryClass = (entry: ProfileEntry): string | null => {
    if (entry.type !== 'method' || !entry.metadata?.function) return null;
    const parsed = parseFn(entry.metadata.function as string);
    return parsed ? shortClass(parsed.className) : null;
};

// Label shown when inside a class group — only the method name, no class prefix
export const entryMethodName = (entry: ProfileEntry): string => {
    if (entry.type === 'method' && entry.metadata?.function) {
        const parsed = parseFn(entry.metadata.function as string);
        if (parsed) return shortMethod(parsed.method);
    }
    return entry.name;
};

// Split a profile label like "POST /track-ads" into an HTTP method + path.
export const parseLabel = (label: string): { method: string | null; path: string } => {
    const m = label.match(/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(.+)$/i);
    if (m) return { method: m[1].toUpperCase(), path: m[2] };
    return { method: null, path: label };
};

export const httpMethodColor = (method: string): string => {
    switch (method) {
        case 'GET':
            return 'bg-sky-500/15 text-sky-400';
        case 'POST':
            return 'bg-emerald-500/15 text-emerald-400';
        case 'PUT':
        case 'PATCH':
            return 'bg-amber-500/15 text-amber-400';
        case 'DELETE':
            return 'bg-red-500/15 text-red-400';
        default:
            return 'bg-base-content/10 text-base-content/60';
    }
};

// An entry/value counts as "slow" when at/above 5% of the request total (min 5ms).
export const slowThresholdMs = (totalMs: number): number => Math.max(5, (totalMs ?? 0) * 0.05);
