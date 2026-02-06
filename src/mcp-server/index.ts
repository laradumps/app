import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { registerTools } from './tools';
import { registerPrompts } from './prompts';
import http from 'http';

process.on('exit', (code) => {
    console.error(`Process exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

export interface McpServerInstance {
    server: McpServer;
    httpServer: http.Server | null;
    stop: () => void;
}

export async function createMcpServer(
    port: number = 0,
    logger: (message: string, type?: 'info' | 'error') => void = console.error
): Promise<McpServerInstance> {
    logger('Creating MCP Server instance...');

    const server = new McpServer({
        name: 'LaraDumps MCP Server',
        version: '1.0.0'
    });

    logger('McpServer instance created');
    logger('Registering tools...');
    registerTools(server);
    logger('Tools registered');

    logger('Registering prompts...');
    registerPrompts(server);
    logger('Prompts registered');

    let httpServer: http.Server | null = null;

    if (port > 0) {
        logger(`HTTP mode - Starting Express app...`);

        const app = express();
        logger('Express app created');

        logger('Configuring StreamableHTTPServerTransport...');
        // @ts-ignore
        const transport = new StreamableHTTPServerTransport();
        logger('Transport configured');

        logger('Connecting MCP Server to transport...');
        await server.connect(transport);
        logger('MCP Server connected to transport');

        logger('Registering endpoints...');

        // Handle SSE initialization
        app.get('/sse', async (req: any, res: any) => {
            await transport.handleRequest(req, res);
        });
        logger('  GET /sse');

        // Handle POST messages on /messages (standard)
        app.post('/messages', async (req: any, res: any) => {
            await transport.handleRequest(req, res);
        });
        logger('  POST /messages');

        // Handle POST messages on /sse (fallback/compatibility)
        app.post('/sse', async (req: any, res: any) => {
            await transport.handleRequest(req, res);
        });
        logger('  POST /sse');

        logger(`Starting HTTP server on port ${port}...`);

        httpServer = app.listen(port, '0.0.0.0', () => {
            logger(`LaraDumps MCP Server running on Streamable HTTP mode at http://0.0.0.0:${port}/sse`);
        });

        logger('HTTP server listening');
    } else {
        logger('Stdio mode - For standalone/Claude Desktop execution');
        const transport = new StdioServerTransport();
        logger('Configuring StdioServerTransport...');

        logger('Connecting MCP Server to transport...');
        await server.connect(transport);
        logger('MCP Server connected to transport');

        logger('LaraDumps MCP Server running on Stdio mode');
    }

    logger('MCP Server fully initialized');

    return {
        server,
        httpServer,
        stop: () => {
            if (httpServer) {
                logger('Closing HTTP server...');
                httpServer.close();
                logger('HTTP server closed');
            }
        }
    };
}

// Support running as a standalone script (for Claude Desktop, etc.)
const isStandalone = process.argv[1]?.endsWith('mcp-server.js');

if (isStandalone) {
    const args = process.argv.slice(2);
    const portIndex = args.indexOf('--port');
    const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 0;

    createMcpServer(port).catch((err) => {
        console.error('Server failed to start:', err);
        process.exit(1);
    });
}
