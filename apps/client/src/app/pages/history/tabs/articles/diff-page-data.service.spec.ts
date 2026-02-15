import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { VersionPairs } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { ArticleService } from '../../../../services/articles/article.service';
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

describe('DiffPageDataService', () => {
    let spectator: SpectatorService<DiffPageDataService>;
    let routeSnapshot: { paramMap: ReturnType<typeof convertToParamMap> };

    const createService = createServiceFactory({
        service: DiffPageDataService,
        providers: [
            mockLoggerProvider(),
            { provide: ArticleService, useValue: { getVersionPairs: jest.fn() } },
            {
                provide: ActivatedRoute,
                useFactory: () => ({ snapshot: routeSnapshot }),
            },
        ],
    });

    function setupRoute(params: Record<string, string>): void {
        routeSnapshot = { paramMap: convertToParamMap(params) };
    }

    describe('loadFromRoute with single version ID', () => {
        it('should load version pairs with id param', () => {
            setupRoute({ id: '10' });
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(10, undefined);
            expect(spectator.service.isLoading()).toBe(false);
            expect(spectator.service.error()).toBeUndefined();
            expect(spectator.service.versionPairs()).toEqual(MOCK_VERSION_PAIRS);
        });

        it('should load version pairs with id1 param', () => {
            setupRoute({ id1: '15' });
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(15, undefined);
            expect(spectator.service.versionPairs()).toEqual(MOCK_VERSION_PAIRS);
        });
    });

    describe('loadFromRoute with two version IDs', () => {
        it('should sort IDs and pass older as second param', () => {
            setupRoute({ id1: '10', id2: '5' });
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(10, 5);
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should sort IDs correctly when id1 < id2', () => {
            setupRoute({ id1: '3', id2: '20' });
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(20, 3);
        });
    });

    describe('loadFromRoute with invalid params', () => {
        it('should set error for non-numeric id', () => {
            setupRoute({ id: 'abc' });
            spectator = createService();

            spectator.service.loadFromRoute();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for zero id', () => {
            setupRoute({ id: '0' });
            spectator = createService();

            spectator.service.loadFromRoute();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for negative id', () => {
            setupRoute({ id: '-5' });
            spectator = createService();

            spectator.service.loadFromRoute();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for missing id params', () => {
            setupRoute({});
            spectator = createService();

            spectator.service.loadFromRoute();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for invalid id2 when id1 is valid', () => {
            setupRoute({ id1: '10', id2: 'abc' });
            spectator = createService();

            spectator.service.loadFromRoute();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set error for zero id2', () => {
            setupRoute({ id1: '10', id2: '0' });
            spectator = createService();

            spectator.service.loadFromRoute();

            expect(spectator.service.error()).toBe('Неверный ID версии');
            expect(spectator.service.isLoading()).toBe(false);
        });
    });

    describe('loadFromRoute error handling', () => {
        it('should set generic error on API failure', () => {
            setupRoute({ id: '10' });
            const articleService = {
                getVersionPairs: jest.fn().mockReturnValue(throwError(() => ({ error: { errorCode: 'UNKNOWN' } }))),
            };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            expect(spectator.service.error()).toBe('Ошибка загрузки данных');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should set specific error for NO_PREVIOUS_VERSION', () => {
            setupRoute({ id: '10' });
            const articleService = {
                getVersionPairs: jest
                    .fn()
                    .mockReturnValue(throwError(() => ({ error: { errorCode: 'NO_PREVIOUS_VERSION' } }))),
            };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            expect(spectator.service.error()).toBe('Предыдущая версия не найдена');
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should log error on API failure', () => {
            setupRoute({ id: '10' });
            const apiError = { error: { errorCode: 'UNKNOWN' } };
            const articleService = {
                getVersionPairs: jest.fn().mockReturnValue(throwError(() => apiError)),
            };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('versionInfo computed', () => {
        it('should return undefined when no version pairs loaded', () => {
            setupRoute({});
            spectator = createService();

            expect(spectator.service.versionInfo()).toBeUndefined();
        });

        it('should return version info after loading', () => {
            setupRoute({ id: '10' });
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            const info = spectator.service.versionInfo();
            expect(info).toEqual({
                title: 'Test Article',
                previous: MOCK_VERSION_PAIRS.previous,
                current: MOCK_VERSION_PAIRS.current,
            });
        });
    });

    describe('initial state', () => {
        it('should start with isLoading true', () => {
            setupRoute({});
            spectator = createService();

            expect(spectator.service.isLoading()).toBe(true);
        });

        it('should start with no error', () => {
            setupRoute({});
            spectator = createService();

            expect(spectator.service.error()).toBeUndefined();
        });

        it('should start with no version pairs', () => {
            setupRoute({});
            spectator = createService();

            expect(spectator.service.versionPairs()).toBeUndefined();
        });
    });

    describe('id1 takes precedence over id', () => {
        it('should prefer id1 param over id param', () => {
            setupRoute({ id1: '20', id: '10' });
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(20, undefined);
        });
    });

    describe('logging', () => {
        it('should log on successful load', () => {
            setupRoute({ id: '10' });
            const articleService = { getVersionPairs: jest.fn().mockReturnValue(of(MOCK_VERSION_PAIRS)) };
            spectator = createService({
                providers: [{ provide: ArticleService, useValue: articleService }],
            });

            spectator.service.loadFromRoute();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.info).toHaveBeenCalledWith('Version pairs loaded', {
                currentId: 10,
                previousId: 5,
            });
        });

        it('should log error for invalid version ID', () => {
            setupRoute({ id: 'invalid' });
            spectator = createService();

            spectator.service.loadFromRoute();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith('Invalid version ID in route', 'invalid');
        });
    });
});
