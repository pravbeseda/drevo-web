import * as Sentry from '@sentry/angular';
import { LogEntry, LogProvider, LogLevel } from '../log-provider.interface';

/**
 * Configuration options for Sentry log provider
 */
export interface SentryLogProviderOptions {
    /**
     * Minimum log level to send to Sentry
     * @default 'warn'
     */
    minLevel?: LogLevel;
    /**
     * Whether to add info/debug logs as breadcrumbs
     * @default true
     */
    addBreadcrumbs?: boolean;
}

/**
 * Sentry log provider
 * Sends error/warning logs to Sentry and adds breadcrumbs for lower levels
 *
 * This provider works in conjunction with Sentry.init() in main.ts
 * which handles global error catching and performance monitoring.
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * provideLogProviders([
 *     createIndexedDBLogProvider(),
 *     createSentryLogProvider({ minLevel: 'warn' }),
 * ])
 * ```
 */
export class SentryLogProvider implements LogProvider {
    readonly name = 'sentry';

    private readonly minLevel: LogLevel;
    private readonly addBreadcrumbs: boolean;
    private readonly levelPriority: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    constructor(
        private readonly isProduction: boolean,
        private readonly isBrowser: boolean,
        options?: SentryLogProviderOptions
    ) {
        this.minLevel = options?.minLevel ?? 'warn';
        this.addBreadcrumbs = options?.addBreadcrumbs ?? true;
    }

    get isAvailable(): boolean {
        // Only available in browser and when Sentry is initialized
        return this.isBrowser && this.isProduction;
    }

    log(entry: LogEntry): void {
        if (!this.isAvailable) {
            return;
        }

        const entryPriority = this.levelPriority[entry.level];
        const minPriority = this.levelPriority[this.minLevel];

        // Add breadcrumb for logs below minimum level (if enabled)
        if (entryPriority < minPriority) {
            if (this.addBreadcrumbs) {
                this.addBreadcrumb(entry);
            }
            return;
        }

        // Send to Sentry based on level
        if (entry.level === 'error') {
            this.captureError(entry);
        } else {
            this.captureMessage(entry);
        }
    }

    /**
     * Add a breadcrumb for context (for debug/info logs)
     */
    private addBreadcrumb(entry: LogEntry): void {
        Sentry.addBreadcrumb({
            category: entry.context ?? 'app',
            message: entry.message,
            level: this.mapToSentryLevel(entry.level),
            data: entry.data as Record<string, unknown> | undefined,
            timestamp: entry.timestamp.getTime() / 1000,
        });
    }

    /**
     * Capture error-level logs
     */
    private captureError(entry: LogEntry): void {
        // If data contains an Error instance, capture it as exception
        if (entry.data instanceof Error) {
            Sentry.captureException(entry.data, {
                tags: this.buildTags(entry),
                extra: {
                    message: entry.message,
                    url: entry.url,
                },
            });
        } else {
            Sentry.captureMessage(entry.message, {
                level: 'error',
                tags: this.buildTags(entry),
                extra: this.buildExtra(entry),
            });
        }
    }

    /**
     * Capture warning-level logs as messages
     */
    private captureMessage(entry: LogEntry): void {
        Sentry.captureMessage(entry.message, {
            level: this.mapToSentryLevel(entry.level),
            tags: this.buildTags(entry),
            extra: this.buildExtra(entry),
        });
    }

    /**
     * Build tags for Sentry event
     */
    private buildTags(entry: LogEntry): Record<string, string> {
        const tags: Record<string, string> = {};

        if (entry.context) {
            tags['log.context'] = entry.context;
        }

        return tags;
    }

    /**
     * Build extra data for Sentry event
     */
    private buildExtra(entry: LogEntry): Record<string, unknown> {
        const extra: Record<string, unknown> = {};

        if (entry.data !== undefined) {
            extra['data'] = entry.data;
        }

        if (entry.url) {
            extra['pageUrl'] = entry.url;
        }

        return extra;
    }

    /**
     * Map LogLevel to Sentry severity level
     */
    private mapToSentryLevel(
        level: LogLevel
    ): 'debug' | 'info' | 'warning' | 'error' {
        switch (level) {
            case 'debug':
                return 'debug';
            case 'info':
                return 'info';
            case 'warn':
                return 'warning';
            case 'error':
                return 'error';
        }
    }
}

/**
 * Factory function to create a SentryLogProvider
 * Use this in provideLogProviders()
 *
 * @param isProduction - Whether the app is running in production mode
 * @param isBrowser - Whether the app is running in browser
 * @param options - Optional configuration
 *
 */
export function createSentryLogProvider(
    isProduction: boolean,
    isBrowser: boolean,
    options?: SentryLogProviderOptions
): SentryLogProvider {
    return new SentryLogProvider(isProduction, isBrowser, options);
}
