import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CsrfService } from './csrf.service';
import { CsrfResponse } from '@drevo-web/shared';
import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';

jest.mock('../../../environments/environment', () => ({
    environment: { apiUrl: 'http://test-api' },
}));

describe('CsrfService', () => {
    let spectator: SpectatorService<CsrfService>;
    let httpController: HttpTestingController;
    let loggerService: MockLoggerService;

    const createService = createServiceFactory({
        service: CsrfService,
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            mockLoggerProvider(),
        ],
    });

    const mockCsrfResponse: CsrfResponse = {
        success: true,
        data: { csrfToken: 'test-csrf-token' },
    };

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
        loggerService = spectator.inject(
            LoggerService
        ) as unknown as MockLoggerService;
    });

    afterEach(() => {
        httpController.verify();
    });

    describe('getCsrfToken', () => {
        it('should fetch token from server when no cached token', done => {
            spectator.service.getCsrfToken().subscribe(token => {
                expect(token).toBe('test-csrf-token');
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/csrf'
            );
            expect(req.request.withCredentials).toBe(true);
            req.flush(mockCsrfResponse);
        });

        it('should return cached token on subsequent calls', done => {
            // First call - fetches from server
            spectator.service.getCsrfToken().subscribe(() => {
                // Second call - should return cached
                spectator.service.getCsrfToken().subscribe(token => {
                    expect(token).toBe('test-csrf-token');
                    done();
                });
            });

            // Only one request should be made
            const req = httpController.expectOne(
                'http://test-api/api/auth/csrf'
            );
            req.flush(mockCsrfResponse);
        });

        it('should deduplicate concurrent requests', done => {
            // Make multiple concurrent requests
            forkJoin([
                spectator.service.getCsrfToken(),
                spectator.service.getCsrfToken(),
                spectator.service.getCsrfToken(),
            ]).subscribe(([token1, token2, token3]) => {
                expect(token1).toBe('test-csrf-token');
                expect(token2).toBe('test-csrf-token');
                expect(token3).toBe('test-csrf-token');
                done();
            });

            // Only one request should be made due to shareReplay
            const req = httpController.expectOne(
                'http://test-api/api/auth/csrf'
            );
            req.flush(mockCsrfResponse);
        });

        it('should throw error on invalid response', done => {
            spectator.service.getCsrfToken().subscribe({
                error: err => {
                    expect(err.message).toBe('Invalid CSRF response');
                    done();
                },
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/csrf'
            );
            req.flush({ success: false });
        });

        it('should log error and allow retry after failure', done => {
            // First call - fails
            spectator.service.getCsrfToken().subscribe({
                error: () => {
                    expect(loggerService.mockLogger.error).toHaveBeenCalledWith(
                        'Failed to fetch CSRF token',
                        expect.any(Error)
                    );

                    // Second call - should make new request
                    spectator.service.getCsrfToken().subscribe(token => {
                        expect(token).toBe('test-csrf-token');
                        done();
                    });

                    const retryReq = httpController.expectOne(
                        'http://test-api/api/auth/csrf'
                    );
                    retryReq.flush(mockCsrfResponse);
                },
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/csrf'
            );
            req.flush({ success: false });
        });
    });

    describe('initCsrfToken', () => {
        it('should fetch token on init', () => {
            spectator.service.initCsrfToken();

            const req = httpController.expectOne(
                'http://test-api/api/auth/csrf'
            );
            req.flush(mockCsrfResponse);
        });

        it('should not fetch if token already cached', done => {
            // First fetch token
            spectator.service.getCsrfToken().subscribe(() => {
                // Then call init - should not make another request
                spectator.service.initCsrfToken();
                httpController.expectNone('http://test-api/api/auth/csrf');
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/csrf'
            );
            req.flush(mockCsrfResponse);
        });
    });

    describe('refreshCsrfToken', () => {
        it('should clear cache and fetch new token', done => {
            // First get a token
            spectator.service.getCsrfToken().subscribe(() => {
                // Then refresh
                spectator.service.refreshCsrfToken().subscribe(token => {
                    expect(token).toBe('new-csrf-token');
                    done();
                });

                const refreshReq = httpController.expectOne(
                    'http://test-api/api/auth/csrf'
                );
                refreshReq.flush({
                    success: true,
                    data: { csrfToken: 'new-csrf-token' },
                });
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/csrf'
            );
            req.flush(mockCsrfResponse);
        });
    });

    describe('updateCsrfToken', () => {
        it('should update cached token', done => {
            spectator.service.updateCsrfToken('manually-set-token');

            // getCsrfToken should return the manually set token
            spectator.service.getCsrfToken().subscribe(token => {
                expect(token).toBe('manually-set-token');
                done();
            });

            // No HTTP request should be made
            httpController.expectNone('http://test-api/api/auth/csrf');
        });

        it('should override fetched token', done => {
            // First fetch token
            spectator.service.getCsrfToken().subscribe(() => {
                // Update with new token
                spectator.service.updateCsrfToken('updated-token');

                // Should return updated token
                spectator.service.getCsrfToken().subscribe(token => {
                    expect(token).toBe('updated-token');
                    done();
                });
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/csrf'
            );
            req.flush(mockCsrfResponse);
        });
    });
});
