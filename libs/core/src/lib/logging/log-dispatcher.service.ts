import { inject, Injectable, InjectionToken, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
    LogEntry,
    LogLevel,
    LogProvider,
    LogStorageProvider,
    isStorageProvider,
} from './log-provider.interface';
import { sanitizeLogEntry } from './log-sanitizer';
import { ConsoleLogProvider } from './providers/console-log.provider';

/**
 * Injection token for log providers
 * Use provideLogProviders() to configure
 */
export const LOG_PROVIDERS = new InjectionToken<LogProvider[]>('LOG_PROVIDERS');

/**
 * Injection token for production mode flag
 */
export const LOG_PRODUCTION_MODE = new InjectionToken<boolean>(
    'LOG_PRODUCTION_MODE',
    { providedIn: 'root', factory: () => false }
);

/**
 * Central log dispatcher service
 * Distributes log entries to all registered providers
 */
@Injectable({ providedIn: 'root' })
export class LogDispatcher {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
    private readonly isProduction = inject(LOG_PRODUCTION_MODE);
    private readonly injectedProviders = inject(LOG_PROVIDERS, {
        optional: true,
    });

    private readonly providers: LogProvider[] = [];
    private currentUrl = '';

    constructor() {
        // Always add console provider
        this.providers.push(
            new ConsoleLogProvider(this.isProduction, this.isBrowser)
        );

        // Add any injected providers
        if (this.injectedProviders) {
            this.providers.push(...this.injectedProviders);
        }

        // Track current URL for log entries
        if (this.isBrowser) {
            this.currentUrl = window.location.pathname;
        }
    }

    /**
     * Register a new log provider
     */
    registerProvider(provider: LogProvider): void {
        if (!this.providers.some(p => p.name === provider.name)) {
            this.providers.push(provider);
        }
    }

    /**
     * Unregister a log provider by name
     */
    unregisterProvider(name: string): void {
        const index = this.providers.findIndex(p => p.name === name);
        if (index !== -1) {
            this.providers.splice(index, 1);
        }
    }

    /**
     * Get all registered providers
     */
    getProviders(): readonly LogProvider[] {
        return this.providers;
    }

    /**
     * Get the first available storage provider (for log export)
     */
    getStorageProvider(): LogStorageProvider | undefined {
        return this.providers.find(
            (p): p is LogStorageProvider =>
                isStorageProvider(p) && p.isAvailable
        );
    }

    /**
     * Dispatch a log entry to all available providers
     */
    dispatch(
        level: LogLevel,
        message: string,
        context?: string,
        data?: unknown
    ): void {
        // Update current URL on each log (in case of navigation)
        if (this.isBrowser) {
            this.currentUrl = window.location.pathname;
        }

        const entry: LogEntry = {
            level,
            message,
            context,
            data,
            timestamp: new Date(),
            url: this.currentUrl || undefined,
        };

        // Sanitize sensitive data before dispatching
        const sanitizedEntry = sanitizeLogEntry(entry);

        // Dispatch to all available providers
        for (const provider of this.providers) {
            if (provider.isAvailable) {
                try {
                    provider.log(sanitizedEntry);
                } catch (error) {
                    // Avoid infinite loops - don't log provider errors
                    console.error(
                        `LogDispatcher: Error in provider '${provider.name}'`,
                        error
                    );
                }
            }
        }
    }

    /**
     * Flush all providers that support buffering
     */
    async flush(): Promise<void> {
        const flushPromises = this.providers
            .filter(
                (p): p is LogProvider & { flush: () => Promise<void> } =>
                    p.isAvailable && typeof p.flush === 'function'
            )
            .map(p => p.flush());

        await Promise.all(flushPromises);
    }
}

/**
 * Provider function to configure log providers
 * @param providers - Array of LogProvider instances or types
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * export const appConfig: ApplicationConfig = {
 *     providers: [
 *         provideLogProviders([indexedDBLogProvider]),
 *     ],
 * };
 * ```
 */
export function provideLogProviders(providers: LogProvider[]) {
    return {
        provide: LOG_PROVIDERS,
        useValue: providers,
    };
}

/**
 * Provider function to set production mode for logging
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * export const appConfig: ApplicationConfig = {
 *     providers: [
 *         provideLogProductionMode(environment.production),
 *     ],
 * };
 * ```
 */
export function provideLogProductionMode(isProduction: boolean) {
    return {
        provide: LOG_PRODUCTION_MODE,
        useValue: isProduction,
    };
}
