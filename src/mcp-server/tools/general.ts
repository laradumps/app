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

async function executeCommand(endpoint: string, successMessage: string): Promise<McpToolResponse> {
    try {
        const response = await fetch(`${API_URL}/${endpoint}`, {
            method: 'POST'
        });

        if (!response.ok) {
            return errorResponse(`HTTP Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            return errorResponse(data.error);
        }

        return textResponse(successMessage);
    } catch (error) {
        return errorResponse(error);
    }
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

    server.registerTool('get_livewire_components', { description: 'Get all Livewire components' }, () =>
        fetchTool('livewire')
    );

    server.registerTool('confetti', { description: 'Fire confetti implementation' }, () =>
        executeCommand('confetti', 'Confetti fired!')
    );

    server.registerTool('clear_jobs', { description: 'Clear all captured jobs' }, () =>
        executeCommand('clear-jobs', 'Jobs cleared!')
    );

    server.registerTool('clear_mails', { description: 'Clear all captured emails' }, () =>
        executeCommand('clear-mails', 'Emails cleared!')
    );

    server.registerTool('clear_logs', { description: 'Clear all captured logs' }, () =>
        executeCommand('clear-logs', 'Logs cleared!')
    );

    server.registerTool('clear_dumps', { description: 'Clear all captured dumps' }, () =>
        executeCommand('clear-dumps', 'Dumps cleared!')
    );

    server.registerTool(
        'toggle_env',
        {
            description:
                'Enable, disable or toggle a environment/watcher (e.g. queries, logs, cache, jobs, etc) for the current project. Use this to control what LaraDumps listens to.',
            inputSchema: {
                env: z
                    .string()
                    .describe('The environment name to toggle (e.g. queries, logs, jobs, cache, http, livewire)'),
                action: z
                    .enum(['enable', 'disable', 'toggle'])
                    .optional()
                    .describe('The action to perform. Defaults to toggle.')
            }
        },
        async ({ env, action }) => {
            const data = await fetchData('toggle-env', { env, action });

            if (data.error) {
                return errorResponse(data.error);
            }

            return textResponse(`Successfully set ${env} to ${data.enabled ? 'enabled' : 'disabled'}`);
        }
    );
}
