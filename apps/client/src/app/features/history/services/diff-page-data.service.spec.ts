import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { ApprovalStatus, VersionPairs } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { ArticleService } from '../../../services/articles/article.service';
import { DiffPageDataService } from './diff-page-data.service';

const MOCK_VERSION_PAIRS: VersionPairs = {
    current: {
        versionId: 10,
        content: 'current content',
        author: 'Author A',
        date: new Date('2025-06-15T12:00:00'),
        title: 'Test Article',
        info: 'current info',
    },
    previous: {
        versionId: 5,
        content: 'previous content',
        author: 'Author B',
        date: new Date('2025-06-10T10:00:00'),
        title: 'Test Article',
        info: 'previous info',
    },
};

function makeSnapshot(params: Record<string, string>): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params) } as unknown as ActivatedRouteSnapshot;
}

describe('DiffPageDataService', () => {
    let spectator: SpectatorService<DiffPageDataService>;

    const createService = createServiceFactory({
        service: DiffPageDataService,
        providers: [mockLoggerProvider(), { provide: ArticleService, useValue: { getVersionPairs: jest.fn() } }],
    });

    describe('load with single version ID', () => {
        it('should load version pairs with id param', () => {
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id: '10' })).subscribe();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(10, undefined);
            expect(spectator.service.isLoading()).toBe(false);
            expect(spectator.service.error()).toBeUndefined();
            expect(spectator.service.versionPairs()).toEqual(MOCK_VERSION_PAIRS);
        });

        it('should load version pairs with id1 param', () => {
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id1: '15' })).subscribe();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(15, undefined);
            expect(spectator.service.versionPairs()).toEqual(MOCK_VERSION_PAIRS);
        });
    });

    describe('load with two version IDs', () => {
        it('should sort IDs and pass older as second param', () => {
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id1: '10', id2: '5' })).subscribe();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(10, 5);
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should sort IDs correctly when id1 < id2', () => {
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id1: '3', id2: '20' })).subscribe();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(20, 3);
        });
    });

    describe('load with invalid params', () => {
        it('should set error for non-numeric id', () => {
            spectator = createService();

            spectator.service.load(makeSnapshot({ id: 'abc' })).subscribe();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for zero id', () => {
            spectator = createService();

            spectator.service.load(makeSnapshot({ id: '0' })).subscribe();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for negative id', () => {
            spectator = createService();

            spectator.service.load(makeSnapshot({ id: '-5' })).subscribe();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for missing id params', () => {
            spectator = createService();

            spectator.service.load(makeSnapshot({})).subscribe();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for invalid id2 when id1 is valid', () => {
            spectator = createService();

            spectator.service.load(makeSnapshot({ id1: '10', id2: 'abc' })).subscribe();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for zero id2', () => {
            spectator = createService();

            spectator.service.load(makeSnapshot({ id1: '10', id2: '0' })).subscribe();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });
    });

    describe('load error handling', () => {
        it('should set generic error on API failure', () => {
            const articleService = {
                getVersionPairs: jest.fn().mockReturnValue(throwError(() => ({ error: { errorCode: 'UNKNOWN' } }))),
            };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id: '10' })).subscribe();

            expect(spectator.service.error()).toBe('Ошибка загрузки данных');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set specific error for NO_PREVIOUS_VERSION', () => {
            const articleService = {
                getVersionPairs: jest
                    .fn()
                    .mockReturnValue(throwError(() => ({ error: { errorCode: 'NO_PREVIOUS_VERSION' } }))),
            };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id: '10' })).subscribe();

            expect(spectator.service.error()).toBe('Предыдущая версия не найдена');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should log error on API failure', () => {
            const apiError = { error: { errorCode: 'UNKNOWN' } };
            const articleService = {
                getVersionPairs: jest.fn().mockReturnValue(throwError(() => apiError)),
            };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id: '10' })).subscribe();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('initial state', () => {
        it('should start with isLoading true', () => {
            spectator = createService();

            expect(spectator.service.isLoading()).toBe(true);
        });

        it('should start with no error', () => {
            spectator = createService();

            expect(spectator.service.error()).toBeUndefined();
        });

        it('should start with no version pairs', () => {
            spectator = createService();

            expect(spectator.service.versionPairs()).toBeUndefined();
        });
    });

    describe('id1 takes precedence over id', () => {
        it('should prefer id1 param over id param', () => {
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id1: '20', id: '10' })).subscribe();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(20, undefined);
        });
    });

    describe('shareReplay deduplication', () => {
        it('should return the same observable on multiple calls', () => {
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });
            const snapshot = makeSnapshot({ id: '10' });

            const obs1 = spectator.service.load(snapshot);
            const obs2 = spectator.service.load(snapshot);

            expect(obs1).toBe(obs2);
            obs1.subscribe();
            obs2.subscribe();
            expect(articleService.getVersionPairs).toHaveBeenCalledTimes(1);
        });
    });

    describe('updateCurrentApproval', () => {
        it('should update approval status of current version', () => {
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id: '10' })).subscribe();
            spectator.service.updateCurrentApproval(ApprovalStatus.Rejected);

            expect(spectator.service.versionPairs()?.current.approved).toBe(ApprovalStatus.Rejected);
        });

        it('should preserve other version pair fields', () => {
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id: '10' })).subscribe();
            spectator.service.updateCurrentApproval(ApprovalStatus.Approved);

            const pairs = spectator.service.versionPairs();
            expect(pairs?.current.versionId).toBe(MOCK_VERSION_PAIRS.current.versionId);
            expect(pairs?.current.author).toBe(MOCK_VERSION_PAIRS.current.author);
            expect(pairs?.previous).toEqual(MOCK_VERSION_PAIRS.previous);
        });

        it('should do nothing when no version pairs loaded', () => {
            spectator = createService();

            spectator.service.updateCurrentApproval(ApprovalStatus.Approved);

            expect(spectator.service.versionPairs()).toBeUndefined();
        });
    });

    describe('logging', () => {
        it('should log on successful load', () => {
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.load(makeSnapshot({ id: '10' })).subscribe();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.info).toHaveBeenCalledWith('Version pairs loaded', {
                currentId: 10,
                previousId: 5,
            });
        });

        it('should log error for invalid version ID', () => {
            spectator = createService();

            spectator.service.load(makeSnapshot({ id: 'invalid' })).subscribe();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith('Invalid version ID in route', 'invalid');
        });
    });
});
