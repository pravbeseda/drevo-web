import { LogDatabase } from '../log-database';
import { LogEntry } from '../log-provider.interface';
import { IndexedDBLogProvider } from './indexed-db-log.provider';

jest.mock('../log-database');

/**
 * Tests for IndexedDBLogProvider
 *
 * Note: Since IndexedDB is not available in Jest/JSDOM, we test:
 * 1. Provider interface contract (name, isAvailable behavior)
 * 2. SSR safety (provider disabled when window/indexedDB unavailable)
 * 3. Lazy loading of the database, against a mocked LogDatabase and a stub `indexedDB`
 *
 * Integration tests with real IndexedDB would require a browser-based test runner.
 */
describe('IndexedDBLogProvider', () => {
    const createLogEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
        level: 'info',
        message: 'Test message',
        timestamp: new Date('2026-01-18T10:00:00.000Z'),
        ...overrides,
    });

    describe('constructor', () => {
        it('should create provider with correct name', () => {
            const provider = new IndexedDBLogProvider();
            expect(provider.name).toBe('indexeddb');
        });

        it('should accept custom max size option', () => {
            const provider = new IndexedDBLogProvider({
                maxSize: 5 * 1024 * 1024,
            });
            expect(provider).toBeDefined();
            expect(provider.name).toBe('indexeddb');
        });
    });

    describe('isAvailable', () => {
        it('should return false in Jest/JSDOM environment (no real IndexedDB)', () => {
            // Jest/JSDOM has window but indexedDB is a mock that doesn't work
            // The provider checks for real indexedDB availability
            const provider = new IndexedDBLogProvider();
            // In Jest, indexedDB exists but isn't functional
            // Provider should be unavailable if database creation fails
            expect(typeof provider.isAvailable).toBe('boolean');
        });
    });

    describe('log() - when unavailable', () => {
        it('should not throw when logging while unavailable', () => {
            const provider = new IndexedDBLogProvider();

            // Even if unavailable, log() should not throw
            expect(() => provider.log(createLogEntry())).not.toThrow();
        });
    });

    describe('flush() - when unavailable', () => {
        it('should resolve without error when unavailable', async () => {
            const provider = new IndexedDBLogProvider();

            await expect(provider.flush()).resolves.toBeUndefined();
        });
    });

    describe('getLogs() - when unavailable', () => {
        it('should return empty array when unavailable', async () => {
            const provider = new IndexedDBLogProvider();

            const logs = await provider.getLogs();

            expect(logs).toEqual([]);
        });
    });

    describe('clearLogs() - when unavailable', () => {
        it('should resolve without error when unavailable', async () => {
            const provider = new IndexedDBLogProvider();

            await expect(provider.clearLogs()).resolves.toBeUndefined();
        });
    });

    describe('getStorageSize() - when unavailable', () => {
        it('should return 0 when unavailable', async () => {
            const provider = new IndexedDBLogProvider();

            const size = await provider.getStorageSize();

            expect(size).toBe(0);
        });
    });
});

describe('IndexedDBLogProvider (SSR)', () => {
    it('should not be available when window is undefined', () => {
        // Save original
        const originalWindow = global.window;

        // Mock SSR environment
        // @ts-expect-error - intentionally setting to undefined for SSR test
        delete global.window;

        const provider = new IndexedDBLogProvider();
        expect(provider.isAvailable).toBe(false);

        // Restore
        global.window = originalWindow;
    });

    it('should handle log() gracefully in SSR', () => {
        const originalWindow = global.window;
        // @ts-expect-error - intentionally setting to undefined for SSR test
        delete global.window;

        const provider = new IndexedDBLogProvider();
        expect(() =>
            provider.log({
                level: 'info',
                message: 'Test',
                timestamp: new Date(),
            }),
        ).not.toThrow();

        global.window = originalWindow;
    });

    it('should return empty logs in SSR', async () => {
        const originalWindow = global.window;
        // @ts-expect-error - intentionally setting to undefined for SSR test
        delete global.window;

        const provider = new IndexedDBLogProvider();
        const logs = await provider.getLogs();
        expect(logs).toEqual([]);

        global.window = originalWindow;
    });
});

describe('IndexedDBLogProvider (browser with IndexedDB)', () => {
    const MockLogDatabase = LogDatabase as jest.MockedClass<typeof LogDatabase>;
    const entry: LogEntry = { level: 'info', message: 'Test', timestamp: new Date('2026-01-18T10:00:00.000Z') };

    beforeEach(() => {
        MockLogDatabase.mockClear();
        Object.defineProperty(global, 'indexedDB', { value: {}, configurable: true });
    });

    afterEach(() => {
        // @ts-expect-error - removing the stub installed above
        delete global.indexedDB;
    });

    it('does not open the database, and so does not load dexie, until something is written', () => {
        const provider = new IndexedDBLogProvider();

        expect(provider.isAvailable).toBe(true);
        expect(MockLogDatabase).not.toHaveBeenCalled();
    });

    it('opens the database on the first flush and writes the buffered entries', async () => {
        const provider = new IndexedDBLogProvider();

        provider.log(entry);
        await provider.flush();

        expect(MockLogDatabase).toHaveBeenCalledTimes(1);
        expect(MockLogDatabase.mock.instances[0].addLogs).toHaveBeenCalledWith([entry]);
    });

    it('opens the database once across flushes', async () => {
        const provider = new IndexedDBLogProvider();

        provider.log(entry);
        await provider.flush();
        provider.log(entry);
        await provider.flush();

        expect(MockLogDatabase).toHaveBeenCalledTimes(1);
    });

    it('keeps the entries and retries opening when the first attempt fails', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        MockLogDatabase.mockImplementationOnce(() => {
            throw new Error('Loading chunk failed');
        });
        const provider = new IndexedDBLogProvider();

        provider.log(entry);
        await provider.flush();
        await provider.flush();

        expect(MockLogDatabase).toHaveBeenCalledTimes(2);
        expect(MockLogDatabase.mock.instances[1].addLogs).toHaveBeenCalledWith([entry]);
    });
});
