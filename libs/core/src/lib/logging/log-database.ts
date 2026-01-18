import Dexie, { Table } from 'dexie';
import { LogEntry } from './log-provider.interface';

/**
 * IndexedDB table entry (LogEntry with required id)
 */
interface LogTableEntry extends Omit<LogEntry, 'timestamp'> {
    id: number;
    timestamp: number; // Store as epoch for easier indexing
}

/**
 * Dexie database wrapper for log storage
 * Handles all IndexedDB operations
 */
export class LogDatabase extends Dexie {
    logs!: Table<LogTableEntry, number>;

    /** User agent string, captured once on init */
    private userAgent: string | undefined;

    constructor() {
        super('drevo-logs');

        this.version(1).stores({
            logs: '++id, timestamp, level',
        });

        // Capture user agent once on initialization
        if (typeof navigator !== 'undefined') {
            this.userAgent = navigator.userAgent;
        }
    }

    /**
     * Get the user agent string
     */
    getUserAgent(): string | undefined {
        return this.userAgent;
    }

    /**
     * Add a log entry to the database
     */
    async addLog(entry: LogEntry): Promise<number> {
        const tableEntry: Omit<LogTableEntry, 'id'> = {
            level: entry.level,
            message: entry.message,
            context: entry.context,
            data: entry.data,
            timestamp: entry.timestamp.getTime(),
            url: entry.url,
        };

        return this.logs.add(tableEntry as LogTableEntry);
    }

    /**
     * Add multiple log entries (for batch writes)
     */
    async addLogs(entries: LogEntry[]): Promise<void> {
        const tableEntries: Omit<LogTableEntry, 'id'>[] = entries.map(
            entry => ({
                level: entry.level,
                message: entry.message,
                context: entry.context,
                data: entry.data,
                timestamp: entry.timestamp.getTime(),
                url: entry.url,
            })
        );

        await this.logs.bulkAdd(tableEntries as LogTableEntry[]);
    }

    /**
     * Get logs with optional filtering
     */
    async getLogs(options?: {
        limit?: number;
        fromDate?: Date;
        toDate?: Date;
        levels?: string[];
    }): Promise<LogEntry[]> {
        let collection = this.logs.orderBy('timestamp').reverse();

        if (options?.fromDate) {
            const from = options.fromDate.getTime();
            collection = collection.filter(log => log.timestamp >= from);
        }

        if (options?.toDate) {
            const to = options.toDate.getTime();
            collection = collection.filter(log => log.timestamp <= to);
        }

        if (options?.levels && options.levels.length > 0) {
            collection = collection.filter(log =>
                options.levels!.includes(log.level)
            );
        }

        const entries = await (options?.limit
            ? collection.limit(options.limit).toArray()
            : collection.toArray());

        // Convert back to LogEntry format
        return entries.map(entry => ({
            id: entry.id,
            level: entry.level,
            message: entry.message,
            context: entry.context,
            data: entry.data,
            timestamp: new Date(entry.timestamp),
            url: entry.url,
        }));
    }

    /**
     * Clear all logs
     */
    async clearLogs(): Promise<void> {
        await this.logs.clear();
    }

    /**
     * Get count of log entries
     */
    async getLogCount(): Promise<number> {
        return this.logs.count();
    }

    /**
     * Delete oldest logs (by percentage)
     * @param percentage - Percentage of logs to delete (0-1)
     */
    async deleteOldestLogs(percentage: number): Promise<void> {
        const count = await this.getLogCount();
        const deleteCount = Math.floor(count * percentage);

        if (deleteCount > 0) {
            const oldestLogs = await this.logs
                .orderBy('timestamp')
                .limit(deleteCount)
                .primaryKeys();

            await this.logs.bulkDelete(oldestLogs);
        }
    }

    /**
     * Get approximate storage size using navigator.storage.estimate()
     * Falls back to rough estimate based on entry count
     */
    async getStorageSize(): Promise<number> {
        // Try using Storage API first (more accurate)
        if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                // Note: This gives total IndexedDB usage, not just our database
                // But it's the most accurate estimate available
                return estimate.usage ?? 0;
            } catch {
                // Fall through to estimate
            }
        }

        // Fallback: rough estimate based on average entry size
        const count = await this.getLogCount();
        // Estimate ~500 bytes per entry (conservative average)
        return count * 500;
    }
}
