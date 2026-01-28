import { LogEntry, LogLevel } from '../log-provider.interface';
import { SentryLogProvider } from './sentry-log.provider';

// Mock Sentry module
jest.mock('@sentry/angular', () => ({
    captureMessage: jest.fn(),
    captureException: jest.fn(),
    addBreadcrumb: jest.fn(),
}));

// Import mocked Sentry after mock is set up
import * as Sentry from '@sentry/angular';

const mockSentry = Sentry as jest.Mocked<typeof Sentry>;

describe('SentryLogProvider', () => {
    let provider: SentryLogProvider;

    const createEntry = (
        level: LogLevel,
        message = 'Test message',
        options: Partial<LogEntry> = {}
    ): LogEntry => ({
        level,
        message,
        timestamp: new Date('2026-01-18T12:00:00Z'),
        ...options,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isAvailable', () => {
        it('should be available in production browser environment', () => {
            provider = new SentryLogProvider(true, true);
            expect(provider.isAvailable).toBe(true);
        });

        it('should not be available in development mode', () => {
            provider = new SentryLogProvider(false, true);
            expect(provider.isAvailable).toBe(false);
        });

        it('should not be available in SSR environment', () => {
            provider = new SentryLogProvider(true, false);
            expect(provider.isAvailable).toBe(false);
        });

        it('should not be available in development SSR', () => {
            provider = new SentryLogProvider(false, false);
            expect(provider.isAvailable).toBe(false);
        });
    });

    describe('log method with default options', () => {
        beforeEach(() => {
            provider = new SentryLogProvider(true, true);
        });

        it('should capture error level as captureMessage', () => {
            const entry = createEntry('error', 'Error occurred', {
                context: 'TestService',
                data: { userId: 123 },
            });

            provider.log(entry);

            expect(mockSentry.captureMessage).toHaveBeenCalledWith(
                'Error occurred',
                expect.objectContaining({
                    level: 'error',
                    tags: { 'log.context': 'TestService' },
                    extra: { data: { userId: 123 } },
                })
            );
        });

        it('should capture Error instance as exception', () => {
            const error = new Error('Something went wrong');
            const entry = createEntry('error', 'Error occurred', {
                context: 'TestService',
                data: error,
                url: '/test-page',
            });

            provider.log(entry);

            expect(mockSentry.captureException).toHaveBeenCalledWith(
                error,
                expect.objectContaining({
                    tags: { 'log.context': 'TestService' },
                    extra: { message: 'Error occurred', url: '/test-page' },
                })
            );
            expect(mockSentry.captureMessage).not.toHaveBeenCalled();
        });

        it('should capture warn level as captureMessage with warning severity', () => {
            const entry = createEntry('warn', 'Warning message');

            provider.log(entry);

            expect(mockSentry.captureMessage).toHaveBeenCalledWith(
                'Warning message',
                expect.objectContaining({
                    level: 'warning',
                })
            );
        });

        it('should add breadcrumb for info level by default', () => {
            const entry = createEntry('info', 'Info message', {
                context: 'InfoContext',
                data: { key: 'value' },
            });

            provider.log(entry);

            expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
                category: 'InfoContext',
                message: 'Info message',
                level: 'info',
                data: { key: 'value' },
                timestamp: expect.any(Number),
            });
            expect(mockSentry.captureMessage).not.toHaveBeenCalled();
        });

        it('should add breadcrumb for debug level by default', () => {
            const entry = createEntry('debug', 'Debug message');

            provider.log(entry);

            expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
                expect.objectContaining({
                    category: 'app',
                    message: 'Debug message',
                    level: 'debug',
                })
            );
            expect(mockSentry.captureMessage).not.toHaveBeenCalled();
        });

        it('should not send anything when unavailable', () => {
            provider = new SentryLogProvider(false, true);
            const entry = createEntry('error', 'Error message');

            provider.log(entry);

            expect(mockSentry.captureMessage).not.toHaveBeenCalled();
            expect(mockSentry.captureException).not.toHaveBeenCalled();
            expect(mockSentry.addBreadcrumb).not.toHaveBeenCalled();
        });
    });

    describe('log method with custom minLevel', () => {
        it('should send info level when minLevel is info', () => {
            provider = new SentryLogProvider(true, true, { minLevel: 'info' });
            const entry = createEntry('info', 'Info message');

            provider.log(entry);

            expect(mockSentry.captureMessage).toHaveBeenCalledWith(
                'Info message',
                expect.objectContaining({ level: 'info' })
            );
        });

        it('should add breadcrumb for debug when minLevel is info', () => {
            provider = new SentryLogProvider(true, true, { minLevel: 'info' });
            const entry = createEntry('debug', 'Debug message');

            provider.log(entry);

            expect(mockSentry.addBreadcrumb).toHaveBeenCalled();
            expect(mockSentry.captureMessage).not.toHaveBeenCalled();
        });

        it('should only send errors when minLevel is error', () => {
            provider = new SentryLogProvider(true, true, { minLevel: 'error' });

            provider.log(createEntry('warn', 'Warning'));
            provider.log(createEntry('info', 'Info'));
            provider.log(createEntry('debug', 'Debug'));

            expect(mockSentry.captureMessage).not.toHaveBeenCalled();
            expect(mockSentry.addBreadcrumb).toHaveBeenCalledTimes(3);

            provider.log(createEntry('error', 'Error'));
            expect(mockSentry.captureMessage).toHaveBeenCalledTimes(1);
        });
    });

    describe('log method with breadcrumbs disabled', () => {
        it('should not add breadcrumb when disabled', () => {
            provider = new SentryLogProvider(true, true, {
                addBreadcrumbs: false,
            });
            const entry = createEntry('info', 'Info message');

            provider.log(entry);

            expect(mockSentry.addBreadcrumb).not.toHaveBeenCalled();
        });
    });

    describe('tags and extra data', () => {
        beforeEach(() => {
            provider = new SentryLogProvider(true, true);
        });

        it('should include url in extra when provided', () => {
            const entry = createEntry('error', 'Error', {
                url: '/some/page',
            });

            provider.log(entry);

            expect(mockSentry.captureMessage).toHaveBeenCalledWith(
                'Error',
                expect.objectContaining({
                    extra: { pageUrl: '/some/page' },
                })
            );
        });

        it('should use "app" as default category for breadcrumb without context', () => {
            const entry = createEntry('info', 'Info message');

            provider.log(entry);

            expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
                expect.objectContaining({
                    category: 'app',
                })
            );
        });

        it('should not include empty tags when no context', () => {
            const entry = createEntry('error', 'Error');

            provider.log(entry);

            expect(mockSentry.captureMessage).toHaveBeenCalledWith(
                'Error',
                expect.objectContaining({
                    tags: {},
                })
            );
        });
    });

    describe('provider properties', () => {
        it('should have name "sentry"', () => {
            provider = new SentryLogProvider(true, true);
            expect(provider.name).toBe('sentry');
        });
    });
});
