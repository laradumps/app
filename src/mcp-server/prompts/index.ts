import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAnalysisPrompts } from './analysis.js';

export function registerPrompts(server: McpServer) {
    registerAnalysisPrompts(server);
}
