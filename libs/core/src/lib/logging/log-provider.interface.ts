/**
 * Log level types
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry structure for persistence and dispatch
 */
export interface LogEntry {
    /** Auto-increment ID for IndexedDB */
    id?: number;
    /** Log severity level */
    level: LogLevel;
    /** Log message */
    message: string;
    /** Optional context (e.g., service name) */
    context?: string;
    /** Additional data (sanitized before storage) */
    data?: unknown;
    /** When the log was created */
    timestamp: Date;
    /** Current page URL */
    url?: string;
}

/**
 * Options for querying logs from storage
 */
export interface GetLogsOptions {
    /** Maximum number of logs to return */
    limit?: number;
    /** Filter logs from this date */
    fromDate?: Date;
    /** Filter logs until this date */
    toDate?: Date;
    /** Filter by specific log levels */
    levels?: LogLevel[];
}

/**
 * Base interface for log providers
 * Providers receive log entries and handle them (console, IndexedDB, Sentry, etc.)
 */
export interface LogProvider {
    /** Unique provider name for identification */
    readonly name: string;
    /** Whether provider is available (false on SSR for browser-only providers) */
    readonly isAvailable: boolean;
    /** Process a log entry */
    log(entry: LogEntry): void;
    /** Optional: flush buffered logs (for batch providers) */
    flush?(): Promise<void>;
}

/**
 * Extended interface for providers that store logs
 * Used for IndexedDB and similar persistent storage
 */
export interface LogStorageProvider extends LogProvider {
    /** Retrieve logs with optional filtering */
    getLogs(options?: GetLogsOptions): Promise<LogEntry[]>;
    /** Clear all stored logs */
    clearLogs(): Promise<void>;
    /** Get approximate storage size in bytes */
    getStorageSize(): Promise<number>;
}

/**
 * Type guard to check if a provider supports storage operations
 */
export function isStorageProvider(
    provider: LogProvider
): provider is LogStorageProvider {
    return (
        'getLogs' in provider &&
        'clearLogs' in provider &&
        'getStorageSize' in provider
    );
}
