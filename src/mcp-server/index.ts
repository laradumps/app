import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import cors from 'cors';
import { registerTools } from './tools';
import { registerPrompts } from './prompts';
import http from 'http';
import crypto from 'crypto';

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
    let transport: StreamableHTTPServerTransport | null = null;

    if (port > 0) {
        logger(`HTTP mode - Starting Express app...`);

        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID()
        });

        await server.connect(transport);
        logger('MCP Server connected to Streamable HTTP transport');

        const app = express();
        app.use(cors());

        app.use(express.json({ limit: '10mb' }));

        logger('Express app created, CORS and JSON middleware enabled');

        logger('Registering endpoints...');

        app.use((req: any, res: any, next: any) => {
            if (req.path === '/mcp') {
                logger(`Incoming ${req.method} request to ${req.url}`);
            }
            next();
        });

        app.all('/mcp', async (req: any, res: any) => {
            try {
                logger(`Handling ${req.method} /mcp request`);
                if (!transport) {
                    throw new Error('Transport not initialized');
                }
                await transport.handleRequest(req, res, req.body);
                logger(`${req.method} /mcp request handled`);
            } catch (err) {
                logger(`CRITICAL Error in ${req.method} /mcp: ${err}`, 'error');
                if (err instanceof Error) {
                    logger(`Stack: ${err.stack}`, 'error');
                }
                if (!res.headersSent) {
                    res.status(500).send('Internal Server Error');
                }
            }
        });
        logger('  ALL /mcp');

        // Handlers for OAuth discovery to avoid 404s that might confuse clients
        app.get('/.well-known/oauth-authorization-server', (req, res) => {
            logger('Handling GET /.well-known/oauth-authorization-server (Returning 404 - Not Supported)');
            res.status(404).json({ error: 'OAuth not supported' });
        });

        app.get('/.well-known/openid-configuration', (req, res) => {
            logger('Handling GET /.well-known/openid-configuration (Returning 404 - Not Supported)');
            res.status(404).json({ error: 'OpenID not supported' });
        });

        logger(`Starting HTTP server on port ${port}...`);

        httpServer = app.listen(port, '0.0.0.0', () => {
            logger(`LaraDumps MCP Server running on Streamable HTTP mode at http://0.0.0.0:${port}/mcp`);
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
        stop: async () => {
            if (transport) {
                logger('Closing transport...');
                await server.close();
                transport = null;
            }
            if (httpServer) {
                logger('Closing HTTP server...');
                httpServer.close();
                logger('HTTP server closed');
            }
        }
    };
}

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
