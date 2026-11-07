/**
 * @jest-environment node
 */
import { IndexedDBLogProvider } from './indexed-db-log.provider';

describe('IndexedDBLogProvider (SSR)', () => {
    it('should not be available when window is undefined', () => {
        const provider = new IndexedDBLogProvider();

        expect(provider.isAvailable).toBe(false);
    });

    it('should handle log() gracefully in SSR', () => {
        const provider = new IndexedDBLogProvider();

        expect(() =>
            provider.log({
                level: 'info',
                message: 'Test',
                timestamp: new Date(),
            }),
        ).not.toThrow();
    });

    it('should return empty logs in SSR', async () => {
        const provider = new IndexedDBLogProvider();

        const logs = await provider.getLogs();

        expect(logs).toEqual([]);
    });
});
