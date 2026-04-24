import { VersionCheckService } from './version-check.service';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LoggerService, WINDOW } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { VersionInfo } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

describe('VersionCheckService', () => {
    const windowMock = {} as Window;

    describe('with visible tab', () => {
        let spectator: SpectatorService<VersionCheckService>;
        let http: SpyObject<HttpClient>;
        let emittedVersions: VersionInfo[];
        const documentMock = { visibilityState: 'visible' } as Document;

        const createService = createServiceFactory({
            service: VersionCheckService,
            providers: [
                mockLoggerProvider(),
                { provide: WINDOW, useValue: windowMock },
                { provide: DOCUMENT, useValue: documentMock },
            ],
            mocks: [HttpClient],
        });

        beforeEach(() => {
            jest.useFakeTimers();
            emittedVersions = [];
            spectator = createService();
            http = spectator.inject(HttpClient);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        const mockVersionResponse = (info: VersionInfo) => {
            http.get.mockReturnValue(of(info));
        };

        it('should be created', () => {
            expect(spectator.service).toBeTruthy();
        });

        it('should fetch initial version on startPolling', () => {
            const version: VersionInfo = { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' };
            mockVersionResponse(version);

            spectator.service.startPolling();

            expect(http.get).toHaveBeenCalledTimes(1);
            expect(http.get).toHaveBeenCalledWith(expect.stringMatching(/\/version\.json\?_=\d+/));
        });

        it('should emit newVersionAvailable$ when version changes', () => {
            const v1: VersionInfo = { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' };
            const v2: VersionInfo = { version: '1.1.0', buildTime: '2026-04-20T01:00:00Z', commit: 'def' };

            spectator.service.newVersionAvailable$.subscribe(info => emittedVersions.push(info));

            http.get.mockReturnValue(of(v1));
            spectator.service.startPolling();

            http.get.mockReturnValue(of(v2));
            jest.advanceTimersByTime(environment.versionCheckIntervalMs);

            expect(emittedVersions).toHaveLength(1);
            expect(emittedVersions[0]).toEqual(v2);
        });

        it('should not emit again for the same new version on subsequent polls', () => {
            const v1: VersionInfo = { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' };
            const v2: VersionInfo = { version: '1.1.0', buildTime: '2026-04-20T01:00:00Z', commit: 'def' };

            spectator.service.newVersionAvailable$.subscribe(info => emittedVersions.push(info));

            http.get.mockReturnValue(of(v1));
            spectator.service.startPolling();

            http.get.mockReturnValue(of(v2));
            jest.advanceTimersByTime(environment.versionCheckIntervalMs);
            jest.advanceTimersByTime(environment.versionCheckIntervalMs);
            jest.advanceTimersByTime(environment.versionCheckIntervalMs);

            expect(emittedVersions).toHaveLength(1);
        });

        it('should not emit when version is the same', () => {
            const version: VersionInfo = { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' };

            spectator.service.newVersionAvailable$.subscribe(info => emittedVersions.push(info));

            mockVersionResponse(version);
            spectator.service.startPolling();

            jest.advanceTimersByTime(environment.versionCheckIntervalMs);

            expect(emittedVersions).toHaveLength(0);
        });

        it('should handle fetch errors gracefully', () => {
            const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;
            http.get.mockReturnValue(throwError(() => new Error('Network error')));

            spectator.service.newVersionAvailable$.subscribe(info => emittedVersions.push(info));
            spectator.service.startPolling();

            expect(emittedVersions).toHaveLength(0);
            expect(logger.mockLogger.warn).toHaveBeenCalledWith('Failed to fetch version.json', expect.any(Object));
        });

        it('should continue polling after fetch error', () => {
            const v1: VersionInfo = { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' };
            const v2: VersionInfo = { version: '1.1.0', buildTime: '2026-04-20T01:00:00Z', commit: 'def' };

            spectator.service.newVersionAvailable$.subscribe(info => emittedVersions.push(info));

            http.get.mockReturnValue(of(v1));
            spectator.service.startPolling();

            http.get.mockReturnValue(throwError(() => new Error('Network error')));
            jest.advanceTimersByTime(environment.versionCheckIntervalMs);

            http.get.mockReturnValue(of(v2));
            jest.advanceTimersByTime(environment.versionCheckIntervalMs);

            expect(emittedVersions).toHaveLength(1);
            expect(emittedVersions[0]).toEqual(v2);
        });
    });

    describe('SSR (no window)', () => {
        let spectator: SpectatorService<VersionCheckService>;
        let http: SpyObject<HttpClient>;
        const documentMock = { visibilityState: 'visible' } as Document;

        const createService = createServiceFactory({
            service: VersionCheckService,
            providers: [
                mockLoggerProvider(),
                { provide: WINDOW, useValue: undefined },
                { provide: DOCUMENT, useValue: documentMock },
            ],
            mocks: [HttpClient],
        });

        beforeEach(() => {
            spectator = createService();
            http = spectator.inject(HttpClient);
        });

        it('should not poll during SSR', () => {
            spectator.service.startPolling();

            expect(http.get).not.toHaveBeenCalled();
        });
    });

    describe('with hidden tab', () => {
        let spectator: SpectatorService<VersionCheckService>;
        let http: SpyObject<HttpClient>;
        const hiddenDocument = { visibilityState: 'hidden' } as Document;

        const createService = createServiceFactory({
            service: VersionCheckService,
            providers: [
                mockLoggerProvider(),
                { provide: WINDOW, useValue: windowMock },
                { provide: DOCUMENT, useValue: hiddenDocument },
            ],
            mocks: [HttpClient],
        });

        beforeEach(() => {
            jest.useFakeTimers();
            spectator = createService();
            http = spectator.inject(HttpClient);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should skip polling when tab is in background', () => {
            const version: VersionInfo = { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' };
            http.get.mockReturnValue(of(version));

            spectator.service.startPolling();

            const initialCallCount = http.get.mock.calls.length;

            jest.advanceTimersByTime(environment.versionCheckIntervalMs);

            expect(http.get.mock.calls.length).toBe(initialCallCount);
        });
    });
});
