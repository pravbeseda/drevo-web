import { PLATFORM_ID } from '@angular/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { mockLoggerProvider, MockLoggerService, mockDraftUserIdProvider } from '../testing';
import { LoggerService } from '../logging/logger.service';
import { DraftStorageService } from './draft-storage.service';
import { DRAFT_USER_ID_PROVIDER } from './draft-user-id.token';
import { DraftDatabase } from './draft-database';
import { DraftInput } from './draft.model';

// Mock DraftDatabase to avoid real IndexedDB in tests
jest.mock('./draft-database');

const MockedDraftDatabase = DraftDatabase as jest.MockedClass<typeof DraftDatabase>;

describe('DraftStorageService', () => {
    let spectator: SpectatorService<DraftStorageService>;
    let mockDb: jest.Mocked<DraftDatabase>;

    const createService = createServiceFactory({
        service: DraftStorageService,
        providers: [mockLoggerProvider(), mockDraftUserIdProvider('test-user')],
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockDb = {
            saveDraft: jest.fn().mockResolvedValue(undefined),
            getDraft: jest.fn().mockResolvedValue(undefined),
            getAllDrafts: jest.fn().mockResolvedValue([]),
            countDrafts: jest.fn().mockResolvedValue(0),
            deleteDraft: jest.fn().mockResolvedValue(undefined),
            deleteAllDrafts: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<DraftDatabase>;

        MockedDraftDatabase.mockImplementation(() => mockDb);

        spectator = createService();
    });

    const draftInput: DraftInput = {
        route: '/articles/edit/42',
        title: 'Test Article',
        text: 'Some content',
    };

    describe('save', () => {
        it('should save draft with userId and time', async () => {
            const now = 1700000000000;
            jest.spyOn(Date, 'now').mockReturnValue(now);

            await spectator.service.save(draftInput);

            expect(mockDb.saveDraft).toHaveBeenCalledWith({
                userId: 'test-user',
                route: '/articles/edit/42',
                title: 'Test Article',
                text: 'Some content',
                time: now,
            });
        });
    });

    describe('getByRoute', () => {
        it('should get draft by route for current user', async () => {
            const draft = {
                userId: 'test-user',
                route: '/articles/edit/42',
                title: 'Test',
                text: 'Content',
                time: 1700000000000,
            };
            mockDb.getDraft.mockResolvedValue(draft);

            const result = await spectator.service.getByRoute('/articles/edit/42');

            expect(mockDb.getDraft).toHaveBeenCalledWith('test-user', '/articles/edit/42');
            expect(result).toEqual(draft);
        });

        it('should return undefined when draft does not exist', async () => {
            mockDb.getDraft.mockResolvedValue(undefined);

            const result = await spectator.service.getByRoute('/nonexistent');

            expect(result).toBeUndefined();
        });
    });

    describe('getAll', () => {
        it('should return all drafts for current user', async () => {
            const drafts = [
                { userId: 'test-user', route: '/a', title: 'A', text: '1', time: 2 },
                { userId: 'test-user', route: '/b', title: 'B', text: '2', time: 1 },
            ];
            mockDb.getAllDrafts.mockResolvedValue(drafts);

            const result = await spectator.service.getAll();

            expect(mockDb.getAllDrafts).toHaveBeenCalledWith('test-user');
            expect(result).toEqual(drafts);
        });
    });

    describe('getCount', () => {
        it('should return count of user drafts', async () => {
            mockDb.countDrafts.mockResolvedValue(5);

            const result = await spectator.service.getCount();

            expect(mockDb.countDrafts).toHaveBeenCalledWith('test-user');
            expect(result).toBe(5);
        });
    });

    describe('deleteByRoute', () => {
        it('should delete draft by route for current user', async () => {
            await spectator.service.deleteByRoute('/articles/edit/42');

            expect(mockDb.deleteDraft).toHaveBeenCalledWith('test-user', '/articles/edit/42');
        });
    });

    describe('deleteAll', () => {
        it('should delete all drafts for current user', async () => {
            await spectator.service.deleteAll();

            expect(mockDb.deleteAllDrafts).toHaveBeenCalledWith('test-user');
        });
    });
});

describe('DraftStorageService — unauthenticated user', () => {
    let spectator: SpectatorService<DraftStorageService>;
    let mockDb: jest.Mocked<DraftDatabase>;

    const createUnauthService = createServiceFactory({
        service: DraftStorageService,
        providers: [
            mockLoggerProvider(),
            {
                provide: DRAFT_USER_ID_PROVIDER,
                useValue: () => undefined,
            },
        ],
    });

    const draftInput: DraftInput = {
        route: '/articles/edit/42',
        title: 'Test Article',
        text: 'Some content',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockDb = {
            saveDraft: jest.fn().mockResolvedValue(undefined),
            getDraft: jest.fn().mockResolvedValue(undefined),
            getAllDrafts: jest.fn().mockResolvedValue([]),
            countDrafts: jest.fn().mockResolvedValue(0),
            deleteDraft: jest.fn().mockResolvedValue(undefined),
            deleteAllDrafts: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<DraftDatabase>;
        MockedDraftDatabase.mockImplementation(() => mockDb);
        spectator = createUnauthService();
    });

    it('should reject save when user is not authenticated', async () => {
        await expect(spectator.service.save(draftInput)).rejects.toThrow(
            'DraftStorageService: user is not authenticated',
        );
    });

    it('should reject getByRoute when user is not authenticated', async () => {
        await expect(spectator.service.getByRoute('/route')).rejects.toThrow(
            'DraftStorageService: user is not authenticated',
        );
    });

    it('should reject getAll when user is not authenticated', async () => {
        await expect(spectator.service.getAll()).rejects.toThrow('DraftStorageService: user is not authenticated');
    });

    it('should log error when user is not authenticated', async () => {
        const mockLoggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;

        try {
            await spectator.service.save(draftInput);
        } catch {
            // expected
        }

        expect(mockLoggerService.mockLogger.error).toHaveBeenCalledWith(
            'DraftStorageService: user is not authenticated',
        );
    });
});

describe('DraftStorageService — SSR (server platform)', () => {
    let spectator: SpectatorService<DraftStorageService>;

    const createSsrService = createServiceFactory({
        service: DraftStorageService,
        providers: [
            mockLoggerProvider(),
            mockDraftUserIdProvider('test-user'),
            { provide: PLATFORM_ID, useValue: 'server' },
        ],
    });

    const draftInput: DraftInput = {
        route: '/articles/edit/42',
        title: 'Test Article',
        text: 'Some content',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        MockedDraftDatabase.mockClear();
        spectator = createSsrService();
    });

    it('should return undefined for getByRoute on server', async () => {
        const result = await spectator.service.getByRoute('/route');
        expect(result).toBeUndefined();
    });

    it('should return empty array for getAll on server', async () => {
        const result = await spectator.service.getAll();
        expect(result).toEqual([]);
    });

    it('should return 0 for getCount on server', async () => {
        const result = await spectator.service.getCount();
        expect(result).toBe(0);
    });

    it('should not throw for save on server', async () => {
        await expect(spectator.service.save(draftInput)).resolves.toBeUndefined();
    });

    it('should not create database on server', async () => {
        await spectator.service.save(draftInput);
        expect(MockedDraftDatabase).not.toHaveBeenCalled();
    });
});
