/**
 * Apply limit to data based on settings
 */
export const applyLimit = (data) => {
    if (!data) return [];
    const settings = window.LaraDumps?.settingsStore?.settings;
    const limit = settings && settings.mcp_limit_payload_objects ? parseInt(settings.mcp_limit_payload_objects) : 10;

    const items = Array.isArray(data) ? data : Object.values(data);

    if (items.length <= limit) return items;

    return items.slice(-limit);
};

/**
 * Slim payload for MCP to reduce token usage
 * Removes redundant fields, strips HTML content, and truncates long content
 */
export const slimForMcp = (data, options = {}) => {
    const { maxContentLength = 2000 } = options;

    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map((item) => slimForMcp(item, options));
    }

    if (typeof data !== 'object') return data;

    const slimmed = { ...data };

    // Strip dump HTML content - keep only original_content and variable_type
    if (slimmed.dump && typeof slimmed.dump === 'object') {
        slimmed.dump = {
            original_content: slimmed.dump.original_content,
            variable_type: slimmed.dump.variable_type
        };
    }

    // Remove ide_handle, keep only essential location info
    if (slimmed.ide_handle) {
        const { class_name, line } = slimmed.ide_handle;
        slimmed.location = class_name && line ? `${class_name}:${line}` : null;
        delete slimmed.ide_handle;
    }

    // Remove redundant request headers (not useful for AI context)
    if (slimmed.requests) {
        const { body, routeContext } = slimmed.requests;
        if (body || (routeContext && Object.keys(routeContext).length > 0)) {
            slimmed.requests = {
                ...(body && { body }),
                ...(routeContext && Object.keys(routeContext).length > 0 && { routeContext })
            };
        } else {
            delete slimmed.requests;
        }
    }

    // Remove app info (redundant across entries)
    delete slimmed.app;

    // Remove empty or null fields
    delete slimmed.code_snippet;
    if (slimmed.color === 'blue') delete slimmed.color;

    // Simplify created_at
    if (slimmed.created_at && typeof slimmed.created_at === 'object') {
        delete slimmed.created_at;
    }

    // Normalize and truncate long original_content
    if (slimmed.original_content && typeof slimmed.original_content === 'string') {
        // Normalize whitespace: trim lines and remove empty lines
        slimmed.original_content = slimmed.original_content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join('\n');

        if (slimmed.original_content.length > maxContentLength) {
            slimmed.original_content = slimmed.original_content.substring(0, maxContentLength) + '\n... [truncated]';
        }
    }

    // Slim queries - keep only sql and time
    if (slimmed.queries && Array.isArray(slimmed.queries)) {
        slimmed.queries = slimmed.queries.map((q) => ({
            sql: q.sql,
            time: q.time,
            ...(q.connectionName !== 'mysql' && { connection: q.connectionName })
        }));
        if (slimmed.queries.length === 0) {
            delete slimmed.queries;
        }
    }

    // Remove context (id is already in log_id)
    delete slimmed.context;

    return slimmed;
};
