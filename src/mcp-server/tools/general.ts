import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchData, API_URL } from '../utils.js';

type McpTextContent = {
    type: 'text';
    text: string;
};

type McpToolResponse = {
    content: McpTextContent[];
};

function textResponse(text: string): McpToolResponse {
    return {
        content: [
            {
                type: 'text',
                text
            }
        ]
    };
}

function errorResponse(error: unknown): McpToolResponse {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);

    return textResponse(`Error: ${message}`);
}

async function fetchTool(endpoint: string): Promise<McpToolResponse> {
    const data = await fetchData(endpoint);

    if (data.error) {
        return errorResponse(data.error);
    }

    return textResponse(JSON.stringify(data, null, 2));
}

async function fetchBrainsTool(): Promise<McpToolResponse> {
    const data = await fetchData('brains');

    if (data.error) {
        return errorResponse(data.error);
    }

    let context = '';

    try {
        const response = await fetch('https://raw.githubusercontent.com/r2luna/brain/main/README.md');

        if (response.ok) {
            const text = await response.text();
            context =
                `\n\n--- Context (Brain Documentation) ---\n` + `${text}\n` + `-------------------------------------\n`;
        }
    } catch {
        // intentionally ignored
    }

    return textResponse(`${JSON.stringify(data, null, 2)}${context}`);
}

export function registerGeneralTools(server: McpServer) {
    server.registerTool('get_jobs', { description: 'Get captured background jobs' }, () => fetchTool('jobs'));

    server.registerTool('get_brains', { description: "Get collected 'Brains' data" }, fetchBrainsTool);

    server.registerTool('get_dumps', { description: 'Get all captured dumps' }, () => fetchTool('dumps'));

    server.registerTool('get_project_info', { description: 'Get current project information' }, () =>
        fetchTool('project-info')
    );

    server.registerTool('get_mails', { description: 'Get all captured emails' }, () => fetchTool('mails'));

    server.registerTool('get_livewire_events', { description: 'Get all captured Livewire events' }, () =>
        fetchTool('livewire')
    );

    server.registerTool(
        'search_dumps',
        {
            description: 'Search across all captured dumps, queries, logs, and mails',
            inputSchema: {
                query: z.string().describe('The text to search for')
            }
        },
        ({ query }) => fetchTool(`search?q=${encodeURIComponent(query)}`)
    );

    server.registerTool(
        'clear_dumps',
        { description: 'Clears all dumps/events from the main application screen' },
        async () => {
            try {
                const response = await fetch(`${API_URL}/clear-dumps`, {
                    method: 'POST'
                });

                if (!response.ok) {
                    throw new Error(response.statusText);
                }

                const data = await response.json();

                if (data.error) {
                    return errorResponse(data.error);
                }

                return textResponse('All dumps have been cleared successfully.');
            } catch (error) {
                return errorResponse(error);
            }
        }
    );
}
