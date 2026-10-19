import type { LogDatabase } from '../log-database';
import { LogEntry, LogStorageProvider, GetLogsOptions } from '../log-provider.interface';

/** Default max storage size in bytes (10MB) */
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/** Batch size - number of entries to buffer before writing */
const BATCH_SIZE = 10;

/** Batch timeout - max time to wait before flushing buffer (ms) */
const BATCH_TIMEOUT_MS = 1000;

/** Percentage of logs to delete when pruning (20%) */
const PRUNE_PERCENTAGE = 0.2;

/**
 * IndexedDB log provider
 * Persists logs to browser's IndexedDB using Dexie.js
 *
 * Features:
 * - Batched writes for better performance
 * - Automatic pruning when storage limit is reached
 * - SSR-safe (disabled on server)
 * - Dexie loads with the first write, not with the app (#463)
 */
export class IndexedDBLogProvider implements LogStorageProvider {
    readonly name = 'indexeddb';

    private database: Promise<LogDatabase> | undefined;
    private buffer: LogEntry[] = [];
    private flushTimer: ReturnType<typeof setTimeout> | undefined;
    private flushPromise: Promise<void> | undefined;
    private readonly maxSize: number;
    private readonly isBrowser: boolean;

    constructor(options?: { maxSize?: number }) {
        this.maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
        this.isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
    }

    get isAvailable(): boolean {
        return this.isBrowser;
    }

    /**
     * Add log entry to buffer
     * Will be flushed to IndexedDB when buffer is full or timeout expires
     */
    log(entry: LogEntry): void {
        if (!this.isAvailable) {
            return;
        }

        this.buffer.push(entry);

        // Flush if buffer is full
        if (this.buffer.length >= BATCH_SIZE) {
            void this.flush();
        } else {
            // Start timer if not already running
            this.startFlushTimer();
        }
    }

    /**
     * Flush buffered logs to IndexedDB
     * Serializes concurrent flush calls to prevent ordering issues on failure
     */
    async flush(): Promise<void> {
        if (!this.isAvailable || this.buffer.length === 0) {
            return;
        }

        // If flush is already in progress, wait for it
        if (this.flushPromise) {
            return this.flushPromise;
        }

        this.flushPromise = this.doFlush();
        try {
            await this.flushPromise;
        } finally {
            this.flushPromise = undefined;
        }
    }

    private async doFlush(): Promise<void> {
        // Clear timer
        this.clearFlushTimer();

        // Take current buffer and reset
        const entries = [...this.buffer];
        this.buffer = [];

        try {
            const database = await this.getDatabase();
            await database.addLogs(entries);

            // Check if pruning is needed
            await this.pruneIfNeeded();
        } catch (error) {
            // Re-add entries to buffer on failure
            this.buffer.unshift(...entries);
            console.error('IndexedDBLogProvider: Failed to flush logs', error);
        }
    }

    /**
     * Get logs from IndexedDB
     */
    async getLogs(options?: GetLogsOptions): Promise<LogEntry[]> {
        if (!this.isAvailable) {
            return [];
        }

        const database = await this.getDatabase();
        return database.getLogs(options);
    }

    /**
     * Clear all logs from IndexedDB
     */
    async clearLogs(): Promise<void> {
        if (!this.isAvailable) {
            return;
        }

        // Also clear buffer
        this.buffer = [];
        this.clearFlushTimer();

        const database = await this.getDatabase();
        await database.clearLogs();
    }

    /**
     * Get approximate storage size in bytes
     */
    async getStorageSize(): Promise<number> {
        if (!this.isAvailable) {
            return 0;
        }

        const database = await this.getDatabase();
        return database.getStorageSize();
    }

    private getDatabase(): Promise<LogDatabase> {
        // A failed attempt is forgotten, so the next flush tries again
        this.database ??= import('../log-database')
            .then(({ LogDatabase }) => new LogDatabase())
            .catch((error: unknown) => {
                this.database = undefined;
                throw error;
            });
        return this.database;
    }

    private startFlushTimer(): void {
        if (this.flushTimer === undefined) {
            this.flushTimer = setTimeout(() => {
                void this.flush();
            }, BATCH_TIMEOUT_MS);
        }
    }

    private clearFlushTimer(): void {
        if (this.flushTimer !== undefined) {
            clearTimeout(this.flushTimer);
            this.flushTimer = undefined;
        }
    }

    private async pruneIfNeeded(): Promise<void> {
        const size = await this.getStorageSize();

        if (size > this.maxSize) {
            const database = await this.getDatabase();
            await database.deleteOldestLogs(PRUNE_PERCENTAGE);
        }
    }
}

/**
 * Factory function to create IndexedDB provider
 * Use this in provideLogProviders()
 */
export function createIndexedDBLogProvider(options?: { maxSize?: number }): IndexedDBLogProvider {
    return new IndexedDBLogProvider(options);
}
