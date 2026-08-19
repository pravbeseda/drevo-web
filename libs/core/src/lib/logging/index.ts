// Interfaces
export { isStorageProvider } from './log-provider.interface';
export type { GetLogsOptions, LogEntry, LogLevel, LogProvider, LogStorageProvider } from './log-provider.interface';

// Services
export { LoggerService } from './logger.service';
export type { Logger } from './logger.service';
export {
    LogDispatcher,
    LOG_PROVIDERS,
    LOG_PRODUCTION_MODE,
    provideLogProviders,
    provideLogProductionMode,
} from './log-dispatcher.service';
export { LogExportService } from './log-export.service';

// Utilities
export { sanitizeLogData, sanitizeLogEntry } from './log-sanitizer';

// Database
export { LogDatabase } from './log-database';

// Providers
export { ConsoleLogProvider } from './providers/console-log.provider';
export { IndexedDBLogProvider, createIndexedDBLogProvider } from './providers/indexed-db-log.provider';
export { SentryLogProvider, createSentryLogProvider } from './providers/sentry-log.provider';
export type { SentryLogProviderOptions } from './providers/sentry-log.provider';
