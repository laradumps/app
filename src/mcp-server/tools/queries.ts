import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchData } from '../utils.js';

export function registerQueryTools(server: McpServer) {
    server.registerTool(
        'get_queries',
        {
            description: 'Get captured SQL queries',
            inputSchema: {
                limit: z.number().optional().describe('Limit the number of queries returned')
            }
        },
        async ({ limit }) => {
            const data = await fetchData('queries');
            if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };

            let queries = Array.isArray(data) ? data : Object.values(data);

            if (limit) {
                queries = queries.slice(-limit);
            }

            return {
                content: [{ type: 'text', text: JSON.stringify(queries, null, 2) }]
            };
        }
    );

    server.registerTool(
        'get_problematic_queries',
        {
            description: 'Get problematic SQL queries (duplicates or with EXPLAIN nodes)',
            inputSchema: {
                limit: z.number().optional().describe('Limit the number of problematic queries returned')
            }
        },
        async ({ limit }) => {
            const endpoint = limit ? `problematic-queries?limit=${limit}` : 'problematic-queries';
            const data = await fetchData(endpoint);
            if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };

            const problematicQueries = Array.isArray(data) ? data : Object.values(data);

            return {
                content: [{ type: 'text', text: JSON.stringify(problematicQueries, null, 2) }]
            };
        }
    );
}
