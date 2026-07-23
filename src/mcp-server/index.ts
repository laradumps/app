import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
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
    server: McpServer | null;
    httpServer: http.Server | null;
    stop: () => void;
}

interface McpSession {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
}

export async function createMcpServer(
    port: number = 0,
    logger: (message: string, type?: 'info' | 'error') => void = console.error
): Promise<McpServerInstance> {
    logger('Creating MCP Server instance...');

    // Build a fully-configured McpServer for a single connection. The Streamable HTTP
    // transport is stateful and a Protocol instance may only be connected to one transport
    // at a time, so every client session gets its own server + transport pair.
    const buildServer = (): McpServer => {
        const server = new McpServer({
            name: 'LaraDumps MCP Server',
            version: '1.0.0'
        });

        registerTools(server);
        registerPrompts(server);

        return server;
    };

    let httpServer: http.Server | null = null;
    let stdioServer: McpServer | null = null;

    // Active sessions keyed by the Mcp-Session-Id handed back to the client.
    const sessions: Record<string, McpSession> = {};

    if (port > 0) {
        logger(`HTTP mode - Starting Express app...`);

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

        const handleMcpRequest = async (req: any, res: any) => {
            try {
                const sessionId = req.headers['mcp-session-id'] as string | undefined;
                let transport: StreamableHTTPServerTransport;

                if (sessionId && sessions[sessionId]) {
                    // Existing session - reuse its transport.
                    transport = sessions[sessionId].transport;
                } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
                    // New client initialization - create a dedicated server + transport.
                    const server = buildServer();

                    transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => crypto.randomUUID(),
                        onsessioninitialized: (sid: string) => {
                            sessions[sid] = { server, transport };
                            logger(`MCP session initialized: ${sid}`);
                        }
                    });

                    transport.onclose = () => {
                        const sid = transport.sessionId;
                        if (sid && sessions[sid]) {
                            delete sessions[sid];
                            logger(`MCP session closed: ${sid}`);
                        }
                    };

                    await server.connect(transport);
                } else {
                    // Non-initialize request without a known session id.
                    res.status(400).json({
                        jsonrpc: '2.0',
                        error: { code: -32000, message: 'Bad Request: No valid session ID' },
                        id: null
                    });
                    return;
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
        };

        app.all('/mcp', handleMcpRequest);
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

        // OAuth Dynamic Client Registration fallback. Return JSON (not Express' default HTML)
        // so a client SDK attempting DCR doesn't crash parsing the 404 body.
        app.post('/register', (req, res) => {
            logger('Handling POST /register (Returning 404 - OAuth not supported)');
            res.status(404).json({ error: 'OAuth not supported' });
        });

        logger(`Starting HTTP server on port ${port}...`);

        httpServer = app.listen(port, '0.0.0.0', () => {
            logger(`LaraDumps MCP Server running on Streamable HTTP mode at http://0.0.0.0:${port}/mcp`);
        });

        logger('HTTP server listening');
    } else {
        logger('Stdio mode - For standalone/Claude Desktop execution');
        stdioServer = buildServer();
        const transport = new StdioServerTransport();
        logger('Configuring StdioServerTransport...');

        logger('Connecting MCP Server to transport...');
        await stdioServer.connect(transport);
        logger('MCP Server connected to transport');

        logger('LaraDumps MCP Server running on Stdio mode');
    }

    logger('MCP Server fully initialized');

    return {
        server: stdioServer,
        httpServer,
        stop: async () => {
            const sessionIds = Object.keys(sessions);
            if (sessionIds.length > 0) {
                logger(`Closing ${sessionIds.length} MCP session(s)...`);
                for (const sid of sessionIds) {
                    try {
                        await sessions[sid].server.close();
                    } catch (err) {
                        logger(`Error closing session ${sid}: ${err}`, 'error');
                    }
                    delete sessions[sid];
                }
            }

            if (stdioServer) {
                logger('Closing stdio server...');
                await stdioServer.close();
                stdioServer = null;
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
