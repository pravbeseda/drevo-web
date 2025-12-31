import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    context?: string;
    data?: unknown;
    timestamp: Date;
}

/**
 * Logger interface matching console API
 */
export interface Logger {
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, data?: unknown): void;
}

/**
 * Context-bound logger wrapper
 * Provides console-like API with automatic context prefix
 */
class ContextLogger implements Logger {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly context: string
    ) {}

    debug(message: string, data?: unknown): void {
        this.loggerService.debug(message, data, this.context);
    }

    info(message: string, data?: unknown): void {
        this.loggerService.info(message, data, this.context);
    }

    warn(message: string, data?: unknown): void {
        this.loggerService.warn(message, data, this.context);
    }

    error(message: string, data?: unknown): void {
        this.loggerService.error(message, data, this.context);
    }
}

/**
 * Centralized logging service
 * - Disables debug/info logs in production
 * - Adds context and timestamps
 * - Can be extended to send logs to server
 *
 * Usage:
 * ```typescript
 * private readonly logger = inject(LoggerService).withContext('MyService');
 * this.logger.debug('Something happened', { data });
 * ```
 *
 * Note: Production mode is determined by Angular's isDevMode() at runtime.
 * This allows the service to be used across different apps with different
 * environment configurations.
 */
@Injectable({
    providedIn: 'root',
})
export class LoggerService implements Logger {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    /**
     * Production mode flag. Defaults to false (development mode).
     * Can be configured via `setProductionMode()` during app initialization.
     */
    private isProduction = false;

    /**
     * Configure production mode for the logger.
     * Call this in app initialization if needed.
     */
    setProductionMode(isProduction: boolean): void {
        this.isProduction = isProduction;
    }

    /**
     * Create a context-bound logger instance
     * @param context - Context name to prefix all log messages (e.g., 'AuthService')
     * @returns Logger instance with console-like API
     */
    withContext(context: string): Logger {
        return new ContextLogger(this, context);
    }

    /**
     * Log debug message (disabled in production)
     */
    debug(message: string, data?: unknown, context?: string): void {
        if (!this.isProduction) {
            this.log('debug', message, context, data);
        }
    }

    /**
     * Log info message (disabled in production)
     */
    info(message: string, data?: unknown, context?: string): void {
        if (!this.isProduction) {
            this.log('info', message, context, data);
        }
    }

    /**
     * Log warning message
     */
    warn(message: string, data?: unknown, context?: string): void {
        this.log('warn', message, context, data);
    }

    /**
     * Log error message
     */
    error(message: string, data?: unknown, context?: string): void {
        this.log('error', message, context, data);
    }

    private log(
        level: LogLevel,
        message: string,
        context?: string,
        data?: unknown
    ): void {
        if (!this.isBrowser) {
            return; // Skip logging during SSR
        }

        const entry: LogEntry = {
            level,
            message,
            context,
            data,
            timestamp: new Date(),
        };

        this.outputToConsole(entry);
    }

    private outputToConsole(entry: LogEntry): void {
        const prefix = entry.context ? `[${entry.context}]` : '';
        const timestamp = entry.timestamp.toISOString();
        const formattedMessage = `${timestamp} ${prefix} ${entry.message}`;

        switch (entry.level) {
            case 'debug':
                if (entry.data !== undefined) {
                    console.debug(formattedMessage, entry.data);
                } else {
                    console.debug(formattedMessage);
                }
                break;
            case 'info':
                if (entry.data !== undefined) {
                    console.info(formattedMessage, entry.data);
                } else {
                    console.info(formattedMessage);
                }
                break;
            case 'warn':
                if (entry.data !== undefined) {
                    console.warn(formattedMessage, entry.data);
                } else {
                    console.warn(formattedMessage);
                }
                break;
            case 'error':
                if (entry.data !== undefined) {
                    console.error(formattedMessage, entry.data);
                } else {
                    console.error(formattedMessage);
                }
                break;
        }
    }
}
