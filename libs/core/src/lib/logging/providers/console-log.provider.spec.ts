import { LogEntry } from '../log-provider.interface';
import { ConsoleLogProvider } from './console-log.provider';

describe('ConsoleLogProvider', () => {
    let provider: ConsoleLogProvider;

    const createEntry = (
        level: LogEntry['level'],
        data?: unknown
    ): LogEntry => ({
        level,
        message: 'Test message',
        context: 'TestContext',
        timestamp: new Date('2026-01-18T10:00:00.000Z'),
        url: '/test',
        data,
    });

    beforeEach(() => {
        jest.spyOn(console, 'debug').mockImplementation();
        jest.spyOn(console, 'info').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('in development mode (browser)', () => {
        beforeEach(() => {
            provider = new ConsoleLogProvider(false, true);
        });

        it('should be available', () => {
            expect(provider.isAvailable).toBe(true);
        });

        it('should have name "console"', () => {
            expect(provider.name).toBe('console');
        });

        it('should output debug messages', () => {
            provider.log(createEntry('debug'));

            expect(console.debug).toHaveBeenCalledWith(
                expect.stringContaining('[TestContext] Test message')
            );
        });

        it('should output info messages', () => {
            provider.log(createEntry('info'));

            expect(console.info).toHaveBeenCalledWith(
                expect.stringContaining('[TestContext] Test message')
            );
        });

        it('should output warn messages', () => {
            provider.log(createEntry('warn'));

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('[TestContext] Test message')
            );
        });

        it('should output error messages', () => {
            provider.log(createEntry('error'));

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('[TestContext] Test message')
            );
        });

        it('should include data in output when provided', () => {
            const data = { key: 'value' };
            provider.log(createEntry('info', data));

            expect(console.info).toHaveBeenCalledWith(
                expect.stringContaining('Test message'),
                data
            );
        });

        it('should include timestamp in formatted message', () => {
            provider.log(createEntry('info'));

            expect(console.info).toHaveBeenCalledWith(
                expect.stringContaining('2026-01-18T10:00:00.000Z')
            );
        });
    });

    describe('in production mode (browser)', () => {
        beforeEach(() => {
            provider = new ConsoleLogProvider(true, true);
        });

        it('should be available', () => {
            expect(provider.isAvailable).toBe(true);
        });

        it('should NOT output debug messages', () => {
            provider.log(createEntry('debug'));

            expect(console.debug).not.toHaveBeenCalled();
        });

        it('should NOT output info messages', () => {
            provider.log(createEntry('info'));

            expect(console.info).not.toHaveBeenCalled();
        });

        it('should NOT output warn messages', () => {
            provider.log(createEntry('warn'));

            expect(console.warn).not.toHaveBeenCalled();
        });

        it('should output error messages', () => {
            provider.log(createEntry('error'));

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('[TestContext] Test message')
            );
        });
    });

    describe('on server (SSR)', () => {
        beforeEach(() => {
            provider = new ConsoleLogProvider(false, false);
        });

        it('should not be available', () => {
            expect(provider.isAvailable).toBe(false);
        });

        it('should not output any messages', () => {
            provider.log(createEntry('error'));

            expect(console.error).not.toHaveBeenCalled();
        });
    });

    describe('formatting', () => {
        beforeEach(() => {
            provider = new ConsoleLogProvider(false, true);
        });

        it('should handle entries without context', () => {
            const entry: LogEntry = {
                level: 'info',
                message: 'No context message',
                timestamp: new Date('2026-01-18T10:00:00.000Z'),
            };

            provider.log(entry);

            expect(console.info).toHaveBeenCalledWith(
                expect.stringContaining('No context message')
            );
            expect(console.info).toHaveBeenCalledWith(
                expect.not.stringContaining('[')
            );
        });
    });
});
