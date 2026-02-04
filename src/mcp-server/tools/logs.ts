import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchData } from '../utils.js';

export function registerLogTools(server: McpServer) {
    server.registerTool(
        'get_logs',
        {
            description: 'Get all captured logs',
            inputSchema: {
                limit: z.number().optional().describe('Limit the number of logs returned')
            }
        },
        async ({ limit }) => {
            const data = await fetchData('logs');
            if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };

            let logs = Array.isArray(data) ? data : Object.values(data);

            if (limit) {
                logs = logs.slice(-limit);
            }

            const summary = logs.map((log: any) => ({
                id: log.log_id,
                level: log.level,
                message: log.message,
                context: log.context,
                created_at: log.created_at
            }));

            return {
                content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
            };
        }
    );

    server.registerTool(
        'get_log_details',
        {
            description: 'Get full details of a specific log by ID',
            inputSchema: {
                log_id: z.string().describe('The ID of the log to retrieve')
            }
        },
        async ({ log_id }) => {
            const data = await fetchData('logs');
            if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };

            let log;
            if (Array.isArray(data)) {
                log = data.find((l: any) => l.log_id === log_id || l.id === log_id);
            } else {
                log = data[log_id];
            }

            if (!log) {
                return { content: [{ type: 'text', text: `Log with ID ${log_id} not found.` }] };
            }

            return {
                content: [{ type: 'text', text: JSON.stringify(log, null, 2) }]
            };
        }
    );

    server.registerTool('summarize_logs', { description: 'Summarize the recent application logs' }, async () => {
        const data = await fetchData('logs');
        if (data.error) {
            return {
                content: [{ type: 'text', text: `Failed to fetch logs: ${data.error}` }]
            };
        }

        let logs = Array.isArray(data) ? data : Object.values(data);
        logs = logs.slice(-50); // Take the last 50

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(logs, null, 2)
                }
            ]
        };
    });
}
