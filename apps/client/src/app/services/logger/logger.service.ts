import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    context?: string;
    data?: unknown;
    timestamp: Date;
}

/**
 * Centralized logging service
 * - Disables debug/info logs in production
 * - Adds context and timestamps
 * - Can be extended to send logs to server
 */
@Injectable({
    providedIn: 'root',
})
export class LoggerService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
    private readonly isProduction = environment.production;

    /**
     * Log debug message (disabled in production)
     */
    debug(message: string, context?: string, data?: unknown): void {
        if (!this.isProduction) {
            this.log('debug', message, context, data);
        }
    }

    /**
     * Log info message (disabled in production)
     */
    info(message: string, context?: string, data?: unknown): void {
        if (!this.isProduction) {
            this.log('info', message, context, data);
        }
    }

    /**
     * Log warning message
     */
    warn(message: string, context?: string, data?: unknown): void {
        this.log('warn', message, context, data);
    }

    /**
     * Log error message
     */
    error(message: string, context?: string, data?: unknown): void {
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
