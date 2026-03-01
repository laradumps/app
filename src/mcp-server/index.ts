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
    let currentTransport: StreamableHTTPServerTransport | null = null;
    let isTransportValid = false;

    if (port > 0) {
        logger(`HTTP mode - Starting Express app...`);

        const app = express();
        app.use(cors());

        app.use(express.json({ limit: '10mb' }));

        logger('Express app created, CORS and JSON middleware enabled');

        logger('Registering endpoints...');

        app.use((req: any, res: any, next: any) => {
            if (req.path === '/sse' || req.path === '/messages') {
                logger(`Incoming ${req.method} request to ${req.url}`);
            }
            next();
        });

        app.get('/sse', async (req: any, res: any) => {
            try {
                logger('Handling GET /sse request');
                logger(`  Headers: ${JSON.stringify(req.headers)}`);

                if (!currentTransport || !isTransportValid) {
                    await server.close();
                    // @ts-ignore
                    currentTransport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => crypto.randomUUID()
                    });

                    await server.connect(currentTransport);
                    isTransportValid = true;
                    logger('New transport created for SSE');
                }

                await currentTransport.handleRequest(req, res);
                logger('GET /sse request handled');
            } catch (err) {
                logger(`CRITICAL Error in GET /sse: ${err}`, 'error');
                isTransportValid = false;
                if (err instanceof Error) {
                    logger(`Stack: ${err.stack}`, 'error');
                }
                if (!res.headersSent) {
                    res.status(500).send('Internal Server Error');
                }
            }
        });
        logger('  GET /sse');

        // Handlers for OAuth discovery to avoid 404s that might confuse clients
        app.get('/.well-known/oauth-authorization-server', (req, res) => {
            logger('Handling GET /.well-known/oauth-authorization-server (Returning 404 - Not Supported)');
            res.status(404).json({ error: 'OAuth not supported' });
        });

        app.get('/.well-known/openid-configuration', (req, res) => {
            logger('Handling GET /.well-known/openid-configuration (Returning 404 - Not Supported)');
            res.status(404).json({ error: 'OpenID not supported' });
        });

        // Handle POST messages
        const handlePost = async (req: any, res: any) => {
            try {
                logger(`Handling POST ${req.path} request`);
                logger(`  Headers: ${JSON.stringify(req.headers)}`);

                if (!currentTransport || !isTransportValid) {
                    await server.close();
                    // @ts-ignore
                    currentTransport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => crypto.randomUUID()
                    });
                    await server.connect(currentTransport);
                    isTransportValid = true;
                    logger('New transport created for POST');
                }

                await currentTransport.handleRequest(req, res, req.body);
                logger(`POST ${req.path} request handled`);
            } catch (err) {
                logger(`CRITICAL Error in POST ${req.path}: ${err}`, 'error');
                isTransportValid = false;
                if (err instanceof Error) {
                    logger(`Stack: ${err.stack}`, 'error');
                }
                if (!res.headersSent) {
                    res.status(500).send('Internal Server Error');
                }
            }
        };

        app.post('/messages', handlePost);
        logger('  POST /messages');

        app.post('/sse', handlePost);
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
        stop: async () => {
            if (currentTransport) {
                logger('Closing transport...');
                await server.close();
                currentTransport = null;
                isTransportValid = false;
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
