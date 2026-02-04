import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerLogTools } from './logs.js';
import { registerQueryTools } from './queries.js';
import { registerGeneralTools } from './general.js';

export function registerTools(server: McpServer) {
    registerLogTools(server);
    registerQueryTools(server);
    registerGeneralTools(server);
}
