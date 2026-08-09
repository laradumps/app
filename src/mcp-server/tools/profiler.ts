import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchData } from '../utils.js';

export function registerProfilerTools(server: McpServer) {
    server.registerTool(
        'analyze_profiler',
        {
            description:
                "Analyze captured Profiler data to find performance bottlenecks. Filters profiles by route name (matches the profile label, e.g. 'documents' or 'GET /documents') and/or a minimum total duration in ms, so you only retrieve relevant profiles. Returns per-profile: total_duration_ms, time breakdown by type (by_type), and the slowest entries (with origin file/line) to spot optimization opportunities.",
            inputSchema: {
                route: z
                    .string()
                    .optional()
                    .describe(
                        'Route name filter (substring match on the profile label, e.g. "documents"). Omit to analyze all routes.'
                    ),
                min_total_ms: z
                    .number()
                    .optional()
                    .describe(
                        'Only return profiles whose total duration is >= this value in milliseconds. Use it to skip fast/irrelevant profiles and reduce the payload.'
                    ),
                limit: z.number().optional().describe('Limit the number of profiles returned')
            }
        },
        async ({ route, min_total_ms, limit }) => {
            const params = new URLSearchParams();
            if (route) params.set('route', route);
            if (min_total_ms) params.set('min_total_ms', String(min_total_ms));
            if (limit) params.set('limit', String(limit));
            const qs = params.toString() ? `?${params.toString()}` : '';

            const data = await fetchData(`profiler${qs}`);
            if (data.error) {
                return { content: [{ type: 'text', text: `Error: ${data.error}` }] };
            }

            const lines = [];
            lines.push(`Profiles matched: ${data.count}`);
            lines.push(
                `Filters: route="${data.applied_filters?.route || ''}" min_total_ms=${data.applied_filters?.min_total_ms || 0}`
            );
            lines.push('');

            for (const profile of data.profiles) {
                lines.push(
                    `Profile: ${profile.label} | total=${profile.total_duration_ms}ms | at ${profile.date_time}`
                );
                const types = Object.entries(profile.by_type || {})
                    .sort((a: any, b: any) => b[1].total_duration_ms - a[1].total_duration_ms)
                    .map(([type, info]: any) => `${type}: ${info.total_duration_ms}ms (${info.count})`);
                if (types.length > 0) {
                    lines.push(`  time by type: ${types.join(' | ')}`);
                }
                for (const entry of profile.slowest_entries || []) {
                    const cost =
                        entry.self_duration_ms != null
                            ? `self=${entry.self_duration_ms}ms`
                            : `${entry.duration_ms}ms`;
                    lines.push(
                        `  [${cost}] ${entry.source === 'xhprof' ? 'XHPROF' : entry.type} ${entry.name}${entry.origin ? ` @ ${entry.origin}` : ''}`
                    );
                }
                lines.push('');
            }

            return { content: [{ type: 'text', text: lines.join('\n') }] };
        }
    );
}
