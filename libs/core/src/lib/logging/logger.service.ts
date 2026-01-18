import { Injectable, inject } from '@angular/core';
import { LogDispatcher } from './log-dispatcher.service';
import { LogLevel } from './log-provider.interface';

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
 *
 * Delegates all logging to LogDispatcher which distributes
 * to registered providers (Console, IndexedDB, Sentry, etc.)
 *
 * Usage:
 * ```typescript
 * private readonly logger = inject(LoggerService).withContext('MyService');
 * this.logger.debug('Something happened', { data });
 * ```
 */
@Injectable({
    providedIn: 'root',
})
export class LoggerService implements Logger {
    private readonly dispatcher = inject(LogDispatcher);

    /**
     * Create a context-bound logger instance
     * @param context - Context name to prefix all log messages (e.g., 'AuthService')
     * @returns Logger instance with console-like API
     */
    withContext(context: string): Logger {
        return new ContextLogger(this, context);
    }

    /**
     * Log debug message
     */
    debug(message: string, data?: unknown, context?: string): void {
        this.dispatcher.dispatch('debug', message, context, data);
    }

    /**
     * Log info message
     */
    info(message: string, data?: unknown, context?: string): void {
        this.dispatcher.dispatch('info', message, context, data);
    }

    /**
     * Log warning message
     */
    warn(message: string, data?: unknown, context?: string): void {
        this.dispatcher.dispatch('warn', message, context, data);
    }

    /**
     * Log error message
     */
    error(message: string, data?: unknown, context?: string): void {
        this.dispatcher.dispatch('error', message, context, data);
    }
}

// Re-export LogLevel for convenience
export { LogLevel };
