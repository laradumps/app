export enum LogLevel {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DEBUG = 'debug'
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: number;
    context?: any;
}

export interface LogDriver {
    log(entry: LogEntry): void;
}

export class Logger {
    private drivers: LogDriver[] = [];

    constructor(drivers: LogDriver[] = []) {
        this.drivers = drivers;
    }

    addDriver(driver: LogDriver): void {
        this.drivers.push(driver);
    }

    private log(level: LogLevel, message: string, context?: any): void {
        const entry: LogEntry = {
            level,
            message,
            timestamp: Date.now(),
            context
        };
        this.drivers.forEach((driver) => driver.log(entry));
    }

    info(message: string, context?: any): void {
        this.log(LogLevel.INFO, message, context);
    }

    warn(message: string, context?: any): void {
        this.log(LogLevel.WARN, message, context);
    }

    error(message: string, context?: any): void {
        this.log(LogLevel.ERROR, message, context);
    }

    debug(message: string, context?: any): void {
        this.log(LogLevel.DEBUG, message, context);
    }
}
