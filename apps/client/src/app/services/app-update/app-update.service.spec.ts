import { AppUpdateService } from './app-update.service';
import { VersionCheckService } from './version-check.service';
import { InjectionToken } from '@angular/core';
import { NavigationError, Router } from '@angular/router';
import { LoggerService, NotificationService, WINDOW } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { VersionInfo } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { Subject } from 'rxjs';

const ROUTER_EVENTS = new InjectionToken<Subject<unknown>>('router events');
const VERSION_AVAILABLE = new InjectionToken<Subject<VersionInfo>>('version available');

describe('AppUpdateService', () => {
    let spectator: SpectatorService<AppUpdateService>;
    const reload = jest.fn();
    const windowMock = { location: { reload } } as unknown as Window;

    const createService = createServiceFactory({
        service: AppUpdateService,
        providers: [
            mockLoggerProvider(),
            { provide: WINDOW, useValue: windowMock },
            { provide: ROUTER_EVENTS, useFactory: () => new Subject<unknown>() },
            { provide: VERSION_AVAILABLE, useFactory: () => new Subject<VersionInfo>() },
            {
                provide: Router,
                useFactory: (events$: Subject<unknown>) => ({ events: events$.asObservable() }),
                deps: [ROUTER_EVENTS],
            },
            {
                provide: VersionCheckService,
                useFactory: (version$: Subject<VersionInfo>) => ({
                    newVersionAvailable$: version$.asObservable(),
                    startPolling: jest.fn(),
                }),
                deps: [VERSION_AVAILABLE],
            },
            MockProvider(NotificationService, {
                showPersistent: jest.fn().mockReturnValue(jest.fn()),
            }),
        ],
    });

    beforeEach(() => {
        reload.mockClear();
        jest.useFakeTimers();
        spectator = createService();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const getRouterEvents = () => spectator.inject(ROUTER_EVENTS);
    const getNewVersionAvailable = () => spectator.inject(VERSION_AVAILABLE);

    it('should be created with chunkLoadFailed = false', () => {
        expect(spectator.service.chunkLoadFailed()).toBe(false);
    });

    it('should set chunkLoadFailed to true and log on first notifyChunkLoadFailure', () => {
        const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;
        const error = new Error('Loading chunk 1 failed');

        spectator.service.notifyChunkLoadFailure(error, { url: '/profile', source: 'error-handler' });

        expect(spectator.service.chunkLoadFailed()).toBe(true);
        expect(logger.mockLogger.error).toHaveBeenCalledWith('Chunk load failure — reload prompt shown', {
            error,
            url: '/profile',
            source: 'error-handler',
        });
    });

    it('should be idempotent: second notify does not log again', () => {
        const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;

        spectator.service.notifyChunkLoadFailure(new Error('a'), { url: '/a', source: 'error-handler' });
        spectator.service.notifyChunkLoadFailure(new Error('b'), { url: '/b', source: 'router' });

        expect(logger.mockLogger.error).toHaveBeenCalledTimes(1);
        expect(spectator.service.chunkLoadFailed()).toBe(true);
    });

    it('reload() should log and call window.location.reload()', () => {
        const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;

        spectator.service.reload();

        expect(logger.mockLogger.info).toHaveBeenCalledWith('User clicked reload', { reason: 'chunk-load-failure' });
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('should react to NavigationError with chunk load error', () => {
        const error = new Error('Loading chunk 3 failed');

        getRouterEvents().next(new NavigationError(1, '/profile', error));

        expect(spectator.service.chunkLoadFailed()).toBe(true);
    });

    it('should ignore NavigationError with non-chunk errors', () => {
        getRouterEvents().next(new NavigationError(2, '/x', new TypeError('boom')));

        expect(spectator.service.chunkLoadFailed()).toBe(false);
    });

    it('dismiss() resets the signal and logs', () => {
        const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;
        spectator.service.notifyChunkLoadFailure(new Error('Loading chunk 1 failed'), {
            url: '/a',
            source: 'error-handler',
        });

        spectator.service.dismiss();

        expect(spectator.service.chunkLoadFailed()).toBe(false);
        expect(logger.mockLogger.info).toHaveBeenCalledWith(
            'User dismissed reload prompt; will reappear on next chunk load failure',
        );
    });

    it('dismiss() is a no-op when signal is already false', () => {
        const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;

        spectator.service.dismiss();

        expect(logger.mockLogger.info).not.toHaveBeenCalled();
    });

    it('re-shows prompt after dismiss on next chunk load failure', () => {
        const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;
        spectator.service.notifyChunkLoadFailure(new Error('a'), { url: '/a', source: 'error-handler' });
        spectator.service.dismiss();

        spectator.service.notifyChunkLoadFailure(new Error('b'), { url: '/b', source: 'router' });

        expect(spectator.service.chunkLoadFailed()).toBe(true);
        expect(logger.mockLogger.error).toHaveBeenCalledTimes(2);
    });

    describe('version check', () => {
        beforeEach(() => {
            const notification = spectator.inject(NotificationService) as SpyObject<NotificationService>;
            notification.showPersistent.mockClear();
        });

        it('should call startPolling on version check service', () => {
            const versionCheck = spectator.inject(VersionCheckService);

            spectator.service.startVersionCheck();

            expect(versionCheck.startPolling).toHaveBeenCalledTimes(1);
        });

        it('should show persistent notification when new version available', () => {
            const notification = spectator.inject(NotificationService);
            const version: VersionInfo = { version: '1.1.0', buildTime: '2026-04-20T00:00:00Z', commit: 'def' };

            getNewVersionAvailable().next(version);

            expect(notification.showPersistent).toHaveBeenCalledWith({
                message: 'Доступна новая версия 1.1.0',
                actionLabel: 'Обновить',
                onAction: expect.any(Function),
                onDismiss: expect.any(Function),
            });
        });

        it('should set newVersionAvailable signal when new version available', () => {
            const version: VersionInfo = { version: '1.1.0', buildTime: '2026-04-20T00:00:00Z', commit: 'def' };

            getNewVersionAvailable().next(version);

            expect(spectator.service.newVersionAvailable()).toEqual(version);
        });

        it('should not show notification during cooldown after dismiss', () => {
            const notification = spectator.inject(NotificationService) as SpyObject<NotificationService>;
            const v1: VersionInfo = { version: '1.1.0', buildTime: '2026-04-20T00:00:00Z', commit: 'def' };
            const v2: VersionInfo = { version: '1.2.0', buildTime: '2026-04-20T01:00:00Z', commit: 'ghi' };

            getNewVersionAvailable().next(v1);
            expect(notification.showPersistent).toHaveBeenCalledTimes(1);

            const onDismiss = notification.showPersistent.mock.calls[0][0].onDismiss;
            onDismiss?.();
            notification.showPersistent.mockClear();

            getNewVersionAvailable().next(v2);

            expect(notification.showPersistent).not.toHaveBeenCalled();
        });

        it('should show notification again after cooldown expires via reminder timer', () => {
            const notification = spectator.inject(NotificationService) as SpyObject<NotificationService>;
            const version: VersionInfo = { version: '1.1.0', buildTime: '2026-04-20T00:00:00Z', commit: 'def' };

            getNewVersionAvailable().next(version);
            expect(notification.showPersistent).toHaveBeenCalledTimes(1);

            const onDismiss = notification.showPersistent.mock.calls[0][0].onDismiss;
            onDismiss?.();
            notification.showPersistent.mockClear();

            jest.advanceTimersByTime(60 * 60 * 1000);

            expect(notification.showPersistent).toHaveBeenCalledTimes(1);
            expect(notification.showPersistent).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Доступна новая версия 1.1.0' }),
            );
        });

        it('should reload when action button clicked', () => {
            const notification = spectator.inject(NotificationService) as SpyObject<NotificationService>;
            const version: VersionInfo = { version: '1.1.0', buildTime: '2026-04-20T00:00:00Z', commit: 'def' };

            getNewVersionAvailable().next(version);
            const onAction = notification.showPersistent.mock.calls[0][0].onAction;
            onAction();

            expect(reload).toHaveBeenCalledTimes(1);
        });

        it('should log when showing update notification', () => {
            const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;
            const version: VersionInfo = { version: '1.1.0', buildTime: '2026-04-20T00:00:00Z', commit: 'def' };

            getNewVersionAvailable().next(version);

            expect(logger.mockLogger.info).toHaveBeenCalledWith('Showing update notification', {
                version: '1.1.0',
            });
        });
    });
});
