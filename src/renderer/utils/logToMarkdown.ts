import { Log } from "@/store/logs";

export function logToMarkdown(log: Log): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${log.level.toUpperCase()} - ${log.message}`);
    lines.push("");

    // Application Information
    if (log.app) {
        if (log.app.php_version) {
            lines.push(`**PHP Version:** ${log.app.php_version}`);
        }
        if (log.app.laravel_version) {
            lines.push(`**Laravel Version:** ${log.app.laravel_version}`);
        }
        if (log.app.environment) {
            lines.push(`**Environment:** ${log.app.environment}`);
        }
        lines.push("");
    }

    // Stack Trace
    if (log.code_snippet && log.code_snippet.length > 0) {
        lines.push("## Stack Trace");
        lines.push("");

        if (log.ide_handle && log.ide_handle.class_name !== "empty") {
            lines.push(`**File:** \`${log.ide_handle.class_name}:${log.ide_handle.line}\``);
            lines.push("");
        }

        // Limit to last 10 frames
        const frames = log.code_snippet.slice(0, 10);
        const hasMore = log.code_snippet.length > 10;

        frames.forEach((frame: any, frameIndex: number) => {
            if (frame && frame.snippet) {
                lines.push(`### Frame ${frameIndex + 1}`);
                lines.push("");
                lines.push(`**File:** \`${frame.file}:${frame.line}\``);
                lines.push(`**Route:** \`${frame.route}\``);
                lines.push("");
                lines.push("```php");

                Object.entries(frame.snippet).forEach(([lineNumber, code]) => {
                    if (code) {
                        lines.push(`${lineNumber} - ${code}`);
                    }
                });

                lines.push("```");
                lines.push("");
            }
        });

        if (hasMore) {
            lines.push(`*... and ${log.code_snippet.length - 10} more frames*`);
            lines.push("");
        }
    }

    // Payload
    if (log.context && log.context.length > 0 && log.context[0] && log.code_snippet.length === 0) {
        lines.push("## Payload");
        lines.push("");

        // Strip HTML tags for markdown
        let cleanPayload = log.context[0]
            .replace(/<[^>]*>/g, "")
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&");

        // Try to parse and prettify JSON if it's valid JSON
        try {
            const parsed = JSON.parse(cleanPayload);

            // If it has a snapshot field that's stringified JSON, parse it too
            if (parsed.snapshot && typeof parsed.snapshot === "string") {
                try {
                    parsed.snapshot = JSON.parse(parsed.snapshot);
                } catch {
                    // Keep as string if can't parse
                }
            }

            cleanPayload = JSON.stringify(parsed, null, 2);
        } catch {
            // Not JSON or invalid JSON, keep as is
        }

        lines.push("```json");
        lines.push(cleanPayload);
        lines.push("```");
        lines.push("");
    }

    // Request
    if (log.requests) {
        lines.push("## Request");
        lines.push("");

        // Headers
        lines.push("### Headers");
        lines.push("");

        if (log.requests.headers && Object.keys(log.requests.headers).length > 0) {
            Object.entries(log.requests.headers).forEach(([key, value]) => {
                lines.push(`- **${key}:** \`${value}\``);
            });
        } else {
            lines.push("*No header data available.*");
        }
        lines.push("");

        // Body
        if (log.requests.body) {
            lines.push("### Body");
            lines.push("");

            // Try to parse and prettify JSON body
            let formattedBody = log.requests.body;
            try {
                const parsed = JSON.parse(formattedBody);
                formattedBody = JSON.stringify(parsed, null, 2);
            } catch {
                // Keep as is if not valid JSON
            }

            lines.push("```json");
            lines.push(formattedBody);
            lines.push("```");
            lines.push("");
        }
    }

    // Route Context
    lines.push("## Route Context");
    lines.push("");

    if (log.requests?.routeContext && Object.keys(log.requests.routeContext).length > 0) {
        Object.entries(log.requests.routeContext).forEach(([key, value]) => {
            lines.push(`- **${key}:** \`${value}\``);
        });
    } else {
        lines.push("*No routing data available.*");
    }
    lines.push("");

    // Database Queries
    lines.push("## Database Queries");
    lines.push("");

    if (log.queries && log.queries.length > 0) {
        log.queries.forEach((query, index) => {
            const connectionName = query.connection_name || "default";
            const time = query.time || 0;

            lines.push(`### Query ${index + 1}`);
            lines.push("");
            lines.push(`**Connection:** ${connectionName}`);
            lines.push(`**Time:** ${time} ms`);
            lines.push("");
            lines.push("```sql");
            lines.push(query.sql);
            lines.push("```");
            lines.push("");
        });
    } else {
        lines.push("*No database queries detected.*");
        lines.push("");
    }

    return lines.join("\n");
}

export async function copyLogToMarkdown(log: Log): Promise<void> {
    const markdown = logToMarkdown(log);
    await navigator.clipboard.writeText(markdown);
}
