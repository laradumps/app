import { LogDriver, LogEntry } from './logger';

export class ConsoleLogDriver implements LogDriver {
    log(entry: LogEntry): void {
        const timestamp = new Date(entry.timestamp).toISOString();
        const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;

        switch (entry.level) {
            case 'info':
                console.log(prefix, entry.message);
                break;
            case 'warn':
                console.warn(prefix, entry.message);
                break;
            case 'error':
                console.error(prefix, entry.message);
                break;
            case 'debug':
                console.debug(prefix, entry.message);
                break;
            default:
                console.log(prefix, entry.message);
        }
    }
}
