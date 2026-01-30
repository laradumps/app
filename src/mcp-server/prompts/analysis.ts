import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchData } from '../utils.js';

export function registerAnalysisPrompts(server: McpServer) {
    server.registerPrompt(
        'analyze_last_exception',
        { description: 'Analyze the most recent exception or error log' },
        async () => {
            const data = await fetchData('logs');
            if (data.error) {
                return {
                    messages: [{ role: 'user', content: { type: 'text', text: `Failed to fetch logs: ${data.error}` } }]
                };
            }

            const logs = Array.isArray(data) ? data : Object.values(data);
            const errorLogs = logs.filter((log: any) =>
                ['error', 'critical', 'emergency', 'alert'].includes(log.level?.toLowerCase())
            );

            const lastError = errorLogs.length > 0 ? errorLogs[errorLogs.length - 1] : null;

            if (!lastError) {
                return {
                    messages: [
                        { role: 'user', content: { type: 'text', text: 'No recent error logs found to analyze.' } }
                    ]
                };
            }

            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `Please analyze the following exception/error log and suggest a fix:\n\n${JSON.stringify(lastError, null, 2)}`
                        }
                    }
                ]
            };
        }
    );

    server.registerPrompt(
        'optimize_latest_query',
        { description: 'Analyze and optimize the latest SQL query' },
        async () => {
            const data = await fetchData('queries');
            if (data.error) {
                return {
                    messages: [
                        { role: 'user', content: { type: 'text', text: `Failed to fetch queries: ${data.error}` } }
                    ]
                };
            }

            const queries = Array.isArray(data) ? data : Object.values(data);
            const lastQuery = queries.length > 0 ? queries[queries.length - 1] : null;

            if (!lastQuery) {
                return {
                    messages: [{ role: 'user', content: { type: 'text', text: 'No queries found.' } }]
                };
            }

            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `Please analyze the following SQL query for performance optimization opportunities:\n\n${JSON.stringify(lastQuery, null, 2)}`
                        }
                    }
                ]
            };
        }
    );
}
