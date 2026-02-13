import { PLATFORM_ID } from '@angular/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LoggerService } from '../logging/logger.service';
import { WINDOW } from '../tokens/window.token';
import { StorageService } from './storage.service';

describe('StorageService', () => {
    let spectator: SpectatorService<StorageService>;

    const mockLogger = {
        withContext: jest.fn().mockReturnValue({
            warn: jest.fn(),
            error: jest.fn(),
        }),
    };

    const createService = createServiceFactory({
        service: StorageService,
        providers: [
            { provide: PLATFORM_ID, useValue: 'browser' },
            { provide: LoggerService, useValue: mockLogger },
        ],
    });

    beforeEach(() => {
        spectator = createService();
        localStorage.clear();
        jest.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('get/set with JSON', () => {
        it('should store and retrieve object', () => {
            const data = { name: 'test', count: 42 };
            spectator.service.set('key', data);
            expect(spectator.service.get<typeof data>('key')).toEqual(data);
        });

        it('should store and retrieve array', () => {
            const data = [1, 2, 3];
            spectator.service.set('arr', data);
            expect(spectator.service.get<number[]>('arr')).toEqual(data);
        });

        it('should return undefined for non-existent key', () => {
            expect(spectator.service.get('nonexistent')).toBeUndefined();
        });

        it('should return undefined for invalid JSON', () => {
            localStorage.setItem('invalid', 'not-json{');
            expect(spectator.service.get('invalid')).toBeUndefined();
        });

        it('should handle primitive values', () => {
            spectator.service.set('num', 123);
            spectator.service.set('str', 'hello');
            spectator.service.set('bool', true);

            expect(spectator.service.get<number>('num')).toBe(123);
            expect(spectator.service.get<string>('str')).toBe('hello');
            expect(spectator.service.get<boolean>('bool')).toBe(true);
        });
    });

    describe('getString/setString', () => {
        it('should store and retrieve raw string', () => {
            spectator.service.setString('raw', 'plain text');
            expect(spectator.service.getString('raw')).toBe('plain text');
        });

        it('should return undefined for non-existent key', () => {
            expect(spectator.service.getString('nonexistent')).toBeUndefined();
        });
    });

    describe('remove', () => {
        it('should remove existing key', () => {
            spectator.service.set('toRemove', { data: 1 });
            expect(spectator.service.has('toRemove')).toBe(true);

            spectator.service.remove('toRemove');
            expect(spectator.service.has('toRemove')).toBe(false);
        });
    });

    describe('has', () => {
        it('should return true for existing key', () => {
            spectator.service.set('exists', 'value');
            expect(spectator.service.has('exists')).toBe(true);
        });

        it('should return false for non-existent key', () => {
            expect(spectator.service.has('nonexistent')).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear all keys', () => {
            spectator.service.set('key1', 'value1');
            spectator.service.set('key2', 'value2');

            spectator.service.clear();

            expect(spectator.service.has('key1')).toBe(false);
            expect(spectator.service.has('key2')).toBe(false);
        });
    });
});

describe('StorageService (SSR)', () => {
    let spectator: SpectatorService<StorageService>;

    const mockLogger = {
        withContext: jest.fn().mockReturnValue({
            warn: jest.fn(),
            error: jest.fn(),
        }),
    };

    const createService = createServiceFactory({
        service: StorageService,
        providers: [
            { provide: PLATFORM_ID, useValue: 'server' },
            { provide: LoggerService, useValue: mockLogger },
        ],
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('should return undefined for get on server', () => {
        expect(spectator.service.get('key')).toBeUndefined();
    });

    it('should return undefined for getString on server', () => {
        expect(spectator.service.getString('key')).toBeUndefined();
    });

    it('should return false for set on server', () => {
        expect(spectator.service.set('key', 'value')).toBe(false);
    });

    it('should return false for setString on server', () => {
        expect(spectator.service.setString('key', 'value')).toBe(false);
    });

    it('should return false for has on server', () => {
        expect(spectator.service.has('key')).toBe(false);
    });
});

describe('StorageService (quota exceeded handling)', () => {
    let spectator: SpectatorService<StorageService>;

    const mockLoggerContext = {
        warn: jest.fn(),
        error: jest.fn(),
    };

    const mockLogger = {
        withContext: jest.fn().mockReturnValue(mockLoggerContext),
    };

    const mockLocalStorage = {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        key: jest.fn(),
        length: 0,
    };

    const mockWindow = {
        localStorage: mockLocalStorage,
    } as unknown as Window;

    const createService = createServiceFactory({
        service: StorageService,
        providers: [
            { provide: PLATFORM_ID, useValue: 'browser' },
            { provide: LoggerService, useValue: mockLogger },
            { provide: WINDOW, useValue: mockWindow },
        ],
    });

    beforeEach(() => {
        spectator = createService();
        jest.clearAllMocks();
    });

    describe('set()', () => {
        it('should return false and log quota error when QuotaExceededError is thrown', () => {
            const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
            mockLocalStorage.setItem.mockImplementation(() => {
                throw quotaError;
            });

            const result = spectator.service.set('key', { data: 'value' });

            expect(result).toBe(false);
            expect(mockLoggerContext.error).toHaveBeenCalledWith(
                'localStorage quota exceeded for key "key"',
                quotaError
            );
        });

        it('should return false and log generic error for non-quota errors', () => {
            const genericError = new Error('Some other error');
            mockLocalStorage.setItem.mockImplementation(() => {
                throw genericError;
            });

            const result = spectator.service.set('key', { data: 'value' });

            expect(result).toBe(false);
            expect(mockLoggerContext.error).toHaveBeenCalledWith(
                'Failed to set localStorage value for key "key"',
                genericError
            );
        });
    });

    describe('setString()', () => {
        it('should return false and log quota error when QuotaExceededError is thrown', () => {
            const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
            mockLocalStorage.setItem.mockImplementation(() => {
                throw quotaError;
            });

            const result = spectator.service.setString('key', 'value');

            expect(result).toBe(false);
            expect(mockLoggerContext.error).toHaveBeenCalledWith(
                'localStorage quota exceeded for key "key"',
                quotaError
            );
        });

        it('should return false and log generic error for non-quota errors', () => {
            const genericError = new Error('Some other error');
            mockLocalStorage.setItem.mockImplementation(() => {
                throw genericError;
            });

            const result = spectator.service.setString('key', 'value');

            expect(result).toBe(false);
            expect(mockLoggerContext.error).toHaveBeenCalledWith(
                'Failed to set localStorage value for key "key"',
                genericError
            );
        });
    });
});
