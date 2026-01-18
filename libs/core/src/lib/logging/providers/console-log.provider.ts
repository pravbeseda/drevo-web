import { LogEntry, LogProvider } from '../log-provider.interface';

/**
 * Console log provider
 * Outputs logs to browser console with formatting
 *
 * In production mode: only 'error' level is output
 * In development mode: all levels are output
 */
export class ConsoleLogProvider implements LogProvider {
    readonly name = 'console';

    constructor(
        private readonly isProduction: boolean,
        private readonly isBrowser: boolean
    ) {}

    get isAvailable(): boolean {
        return this.isBrowser;
    }

    log(entry: LogEntry): void {
        if (!this.isAvailable) {
            return;
        }

        // In production, only output errors to console
        if (this.isProduction && entry.level !== 'error') {
            return;
        }

        this.outputToConsole(entry);
    }

    private outputToConsole(entry: LogEntry): void {
        const prefix = entry.context ? `[${entry.context}]` : '';
        const timestamp = entry.timestamp.toISOString();
        const formattedMessage = `${timestamp} ${prefix} ${entry.message}`;

        const consoleMethod = this.getConsoleMethod(entry.level);

        if (entry.data !== undefined) {
            consoleMethod(formattedMessage, entry.data);
        } else {
            consoleMethod(formattedMessage);
        }
    }

    private getConsoleMethod(
        level: LogEntry['level']
    ): (...args: unknown[]) => void {
        switch (level) {
            case 'debug':
                return console.debug.bind(console);
            case 'info':
                return console.info.bind(console);
            case 'warn':
                return console.warn.bind(console);
            case 'error':
                return console.error.bind(console);
        }
    }
}
