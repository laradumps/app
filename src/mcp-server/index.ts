import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import express from 'express';

const API_BASE = 'http://0.0.0.0:9191/api/mcp';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 0;

process.on('exit', (code) => {
    console.error(`Process exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

async function fetchData(endpoint: string) {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

const server = new McpServer({
    name: 'LaraDumps MCP Server',
    version: '1.0.0'
});

server.registerTool('get_logs', { description: 'Get all captured logs' }, async () => {
    const data = await fetchData('logs');
    if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };

    const logs = Object.values(data);
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
});

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

        const log = data[log_id];
        if (!log) {
            return { content: [{ type: 'text', text: `Log with ID ${log_id} not found.` }] };
        }

        return {
            content: [{ type: 'text', text: JSON.stringify(log, null, 2) }]
        };
    }
);

server.registerTool(
    'get_queries',
    {
        description: 'Get captured SQL queries',
        inputSchema: {
            limit: z.number().optional().describe('Limit the number of queries returned (default: 50)')
        }
    },
    async ({ limit = 50 }) => {
        const data = await fetchData('queries');
        if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };

        let queries = Array.isArray(data) ? data : Object.values(data);
        queries = queries.slice(-limit);

        return {
            content: [{ type: 'text', text: JSON.stringify(queries, null, 2) }]
        };
    }
);

server.registerTool('get_jobs', { description: 'Get captured background jobs' }, async () => {
    const data = await fetchData('jobs');
    if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };
    return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
    };
});

server.registerTool('get_brains', { description: "Get collected 'Brains' data" }, async () => {
    const data = await fetchData('brains');
    if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };

    let context = '';
    try {
        const response = await fetch('https://raw.githubusercontent.com/r2luna/brain/main/README.md');
        if (response.ok) {
            const text = await response.text();
            context = `\n\n--- Context (Brain Documentation) ---\n${text}\n-------------------------------------\n`;
        }
    } catch (error) {
        // Silently fail to fetch documentation to not break the tool
    }

    return {
        content: [{ type: 'text', text: `${JSON.stringify(data, null, 2)}${context}` }]
    };
});

server.registerTool('get_dumps', { description: 'Get all captured dumps' }, async () => {
    const data = await fetchData('dumps');
    if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };
    return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
    };
});

server.registerTool('get_project_info', { description: 'Get current project information' }, async () => {
    const data = await fetchData('project-info');
    if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };
    return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
    };
});

server.registerTool('get_mails', { description: 'Get all captured emails' }, async () => {
    const data = await fetchData('mails');
    if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };
    return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
    };
});

server.registerTool('get_livewire_events', { description: 'Get all captured Livewire events' }, async () => {
    const data = await fetchData('livewire');
    if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };
    return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
    };
});

server.registerTool(
    'search_dumps',
    {
        description: 'Search across all captured dumps, queries, logs, and mails',
        inputSchema: {
            query: z.string().describe('The text to search for')
        }
    },
    async ({ query }) => {
        const data = await fetchData(`search?q=${encodeURIComponent(query)}`);
        if (data.error) return { content: [{ type: 'text', text: `Error: ${data.error}` }] };
        return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
        };
    }
);

async function startServer() {
    if (port > 0) {
        const app = express();

        // @ts-ignore
        const transport = new StreamableHTTPServerTransport();

        await server.connect(transport);

        // Handle SSE initialization
        app.get('/sse', async (req: any, res: any) => {
            await transport.handleRequest(req, res);
        });

        // Handle POST messages on /messages (standard)
        app.post('/messages', async (req: any, res: any) => {
            await transport.handleRequest(req, res);
        });

        // Handle POST messages on /sse (fallback/compatibility)
        app.post('/sse', async (req: any, res: any) => {
            await transport.handleRequest(req, res);
        });

        app.listen(port, '0.0.0.0', () => {
            console.error(`LaraDumps MCP Server running on Streamable HTTP mode at http://0.0.0.0:${port}/sse`);
        });
    } else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('LaraDumps MCP Server running on Stdio mode');
    }
}

startServer().catch((err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});
