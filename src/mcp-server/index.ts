import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { registerTools } from './tools';
import { registerPrompts } from './prompts';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 0;

process.on('exit', (code) => {
    console.error(`Process exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

const server = new McpServer({
    name: 'LaraDumps MCP Server',
    version: '1.0.0'
});

registerTools(server);
registerPrompts(server);

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
