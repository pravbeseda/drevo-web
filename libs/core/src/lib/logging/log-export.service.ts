import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LogDispatcher } from './log-dispatcher.service';
import { LogEntry } from './log-provider.interface';
import { NotificationService } from '../services/notification.service';

/**
 * Service for exporting logs as a downloadable CSV file
 */
@Injectable({ providedIn: 'root' })
export class LogExportService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
    private readonly dispatcher = inject(LogDispatcher);
    private readonly notification = inject(NotificationService);

    /**
     * Download all logs as a CSV file
     * File format: semicolon-delimited CSV with headers
     */
    async downloadLogs(): Promise<void> {
        if (!this.isBrowser) {
            return;
        }

        try {
            const storageProvider = this.dispatcher.getStorageProvider();
            if (!storageProvider) {
                this.notification.info('Хранилище логов недоступно');
                return;
            }

            // Flush any buffered logs first
            await this.dispatcher.flush();

            // Get all logs
            const logs = await storageProvider.getLogs();

            if (logs.length === 0) {
                this.notification.info('Нет логов для экспорта');
                return;
            }

            // Generate CSV content
            const csv = this.generateCSV(logs);

            // Trigger download
            this.downloadFile(csv, this.generateFilename());
        } catch (error) {
            console.error('LogExportService: Failed to download logs', error);
            this.notification.error('Не удалось скачать логи');
        }
    }

    /**
     * Clear all stored logs
     */
    async clearLogs(): Promise<void> {
        const storageProvider = this.dispatcher.getStorageProvider();
        if (storageProvider) {
            await storageProvider.clearLogs();
        }
    }

    /**
     * Get current storage size in bytes
     */
    async getStorageSize(): Promise<number> {
        const storageProvider = this.dispatcher.getStorageProvider();
        if (storageProvider) {
            return storageProvider.getStorageSize();
        }
        return 0;
    }

    private generateCSV(logs: LogEntry[]): string {
        // CSV header
        const headers = [
            'timestamp',
            'level',
            'context',
            'message',
            'data',
            'url',
        ];
        const rows: string[] = [headers.join(';')];

        // Add data rows (oldest first for chronological order)
        const sortedLogs = [...logs].reverse();

        for (const log of sortedLogs) {
            const row = [
                log.timestamp.toISOString(),
                log.level.toUpperCase(),
                this.escapeCSV(log.context ?? ''),
                this.escapeCSV(log.message),
                this.escapeCSV(
                    log.data !== undefined ? JSON.stringify(log.data) : ''
                ),
                this.escapeCSV(log.url ?? ''),
            ];
            rows.push(row.join(';'));
        }

        return rows.join('\n');
    }

    /**
     * Escape a value for CSV
     * - Wrap in quotes if contains semicolon, quote, or newline
     * - Double quotes are escaped as ""
     */
    private escapeCSV(value: string): string {
        if (
            value.includes(';') ||
            value.includes('"') ||
            value.includes('\n')
        ) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    private generateFilename(): string {
        const date = new Date().toISOString().split('T')[0];
        return `drevo-logs-${date}.csv`;
    }

    private downloadFile(content: string, filename: string): void {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }
}
