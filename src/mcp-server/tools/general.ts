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

async function fetchTool(endpoint: string, limit?: number): Promise<McpToolResponse> {
    const data = await fetchData(endpoint);

    if (data.error) {
        return errorResponse(data.error);
    }

    if (limit) {
        let items = Array.isArray(data) ? data : Object.values(data);
        items = items.slice(-limit);
        return textResponse(JSON.stringify(items, null, 2));
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

    return textResponse(JSON.stringify(data, null, 2));
}

export function registerGeneralTools(server: McpServer) {
    server.registerTool(
        'get_jobs',
        {
            description: 'Get captured background jobs',
            inputSchema: {
                limit: z.number().optional().describe('Limit the number of jobs returned')
            }
        },
        ({ limit }) => fetchTool('jobs', limit)
    );

    server.registerTool(
        'get_brains',
        {
            description: "Get collected 'Brains' data",
            inputSchema: {
                limit: z.number().optional().describe('Limit the number of brains returned')
            }
        },
        ({ limit }) => fetchBrainsTool(limit)
    );

    server.registerTool(
        'get_dumps',
        {
            description: 'Get all captured dumps',
            inputSchema: {
                limit: z.number().optional().describe('Limit the number of dumps returned')
            }
        },
        ({ limit }) => fetchTool('dumps', limit)
    );

    server.registerTool('get_project_info', { description: 'Get current project information' }, () =>
        fetchTool('project-info')
    );

    server.registerTool(
        'get_mails',
        {
            description:
                'List captured emails (metadata only: message_id, from, to, subject, date, is_read, location, has_attachments). Use get_mail with a message_id to read body, headers or attachments.',
            inputSchema: {
                limit: z.number().optional().describe('Limit the number of emails returned')
            }
        },
        ({ limit }) => fetchTool('mails', limit)
    );

    server.registerTool(
        'get_mail',
        {
            description:
                "Get a single captured email by message_id. Defaults to metadata only (['meta']) to keep payloads small; request body/headers/attachments via 'include' when needed. Use this instead of get_mails when you need email content — get_mails returns only metadata.",
            inputSchema: {
                message_id: z.string().describe('The message_id of the email (returned by get_mails)'),
                include: z
                    .array(z.enum(['meta', 'text', 'html', 'headers', 'details', 'attachments', 'attachment_bodies']))
                    .optional()
                    .describe(
                        "Parts to include. Defaults to ['meta']. 'meta' = from/to/subject/date. 'text' = HTML stripped to plain text (truncated). 'html' = raw HTML (truncated). 'headers' = full headers. 'details' = extra captured details. 'attachments' = filename/path/size (no body). 'attachment_bodies' = attachment body as base64 (heavy)."
                    ),
                max_length: z
                    .number()
                    .int()
                    .positive()
                    .optional()
                    .describe("Truncate length for 'text' and 'html' parts. Defaults to 2000 characters.")
            }
        },
        async ({ message_id, include, max_length }) => {
            const params = new URLSearchParams();
            if (include && include.length > 0) params.set('parts', include.join(','));
            if (max_length) params.set('max_length', String(max_length));
            const qs = params.toString() ? `?${params.toString()}` : '';
            const data = await fetchData(`mails/${encodeURIComponent(message_id)}${qs}`);
            if (data.error) return errorResponse(data.error);
            return textResponse(JSON.stringify(data, null, 2));
        }
    );

    server.registerTool(
        'get_livewire_components',
        {
            description: 'Get all Livewire components',
            inputSchema: {
                limit: z.number().optional().describe('Limit the number of livewire components returned')
            }
        },
        ({ limit }) => fetchTool('livewire', limit)
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
