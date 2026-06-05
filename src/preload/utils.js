const ALL_MAIL_PARTS = ['meta', 'text', 'html', 'headers', 'details', 'attachments', 'attachment_bodies'];

const stripHtml = (html) => {
    if (!html || typeof html !== 'string') return '';
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
};

const truncate = (text, maxLen) => {
    if (!text || text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '\n... [truncated]';
};

/**
 * Slim mail object to meta fields only (safe for listing).
 */
export const slimMailMeta = (mail) => {
    if (!mail) return mail;
    const location = mail.ide_handle?.class_name && mail.ide_handle?.line
        ? `${mail.ide_handle.class_name}:${mail.ide_handle.line}`
        : null;
    return {
        message_id: mail.message_id,
        from: mail.from,
        from_mail: mail.from_mail,
        to: mail.to,
        subject: mail.subject,
        date: mail.date,
        is_read: mail.is_read,
        location,
        has_attachments: Array.isArray(mail.attachments) && mail.attachments.length > 0
    };
};

/**
 * Build mail detail payload from selected parts.
 * parts: array of MailPart strings; unknown parts are ignored.
 */
export const buildMailDetail = (mail, parts, options = {}) => {
    if (!mail) return mail;
    const { maxTextLength = 2000 } = options;
    const set = new Set(Array.isArray(parts) && parts.length > 0 ? parts : ['meta']);
    const result = {};

    if (set.has('meta')) Object.assign(result, slimMailMeta(mail));

    if (set.has('text')) {
        result.text = truncate(stripHtml(mail.html), maxTextLength);
    }
    if (set.has('html')) {
        result.html = truncate(mail.html || '', maxTextLength);
    }
    if (set.has('headers')) {
        result.headers = mail.headers || [];
    }
    if (set.has('details')) {
        result.details = mail.details || [];
    }
    if (set.has('attachments') || set.has('attachment_bodies')) {
        const includeBody = set.has('attachment_bodies');
        result.attachments = (mail.attachments || []).map((a) => {
            const entry = { filename: a.filename, path: a.path };
            if (a.body) entry.size = a.body.length;
            if (includeBody) entry.body = a.body;
            return entry;
        });
    }

    return result;
};

export const parseMailParts = (raw) => {
    if (!raw) return null;
    const parts = String(raw)
        .split(',')
        .map((p) => p.trim())
        .filter((p) => ALL_MAIL_PARTS.includes(p));
    return parts.length > 0 ? parts : null;
};

/**
 * Apply limit to data based on settings
 */
export const applyLimit = (data) => {
    if (!data) return [];

    try {
        const settings = window.LaraDumps?.settingsStore?.settings;
        const limitValue = settings?.mcp_limit_payload_objects;
        const limit = limitValue ? parseInt(limitValue, 10) : 10;

        const items = Array.isArray(data) ? data : Object.values(data);

        if (items.length <= limit) return items;

        return items.slice(-limit);
    } catch (error) {
        console.error('[Preload Utils] Error in applyLimit:', error);
        return Array.isArray(data) ? data : Object.values(data);
    }
};

/**
 * Slim payload for MCP to reduce token usage
 * Removes redundant fields, strips HTML content, and truncates long content
 */
export const slimForMcp = (data, options = {}) => {
    try {
        const { maxContentLength = 2000 } = options;

        if (!data) return data;

        if (Array.isArray(data)) {
            return data.map((item) => {
                try {
                    return slimForMcp(item, options);
                } catch (error) {
                    console.error('[Preload Utils] Error slimming item:', error);
                    return item; // Return original item if slimming fails
                }
            });
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
                slimmed.original_content =
                    slimmed.original_content.substring(0, maxContentLength) + '\n... [truncated]';
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
    } catch (error) {
        console.error('[Preload Utils] Error in slimForMcp:', error);
        // Return data as-is if slimming fails
        return data;
    }
};
