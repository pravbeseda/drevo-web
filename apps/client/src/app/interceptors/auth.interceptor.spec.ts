import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import {
    HttpRequest,
    HttpHandler,
    HttpResponse,
    HttpErrorResponse,
} from '@angular/common/http';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthInterceptor, authInterceptorProvider } from './auth.interceptor';
import { AuthService } from '../services/auth/auth.service';
import { CsrfService } from '../services/auth/csrf.service';
import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';

jest.mock('../../environments/environment', () => ({
    environment: { apiUrl: 'http://test-api' },
}));

describe('AuthInterceptor', () => {
    let spectator: SpectatorService<AuthInterceptor>;
    let authService: jest.Mocked<AuthService>;
    let csrfService: jest.Mocked<CsrfService>;
    let loggerService: MockLoggerService;
    let mockHandler: jest.Mocked<HttpHandler>;
    let authOperationInProgress$: BehaviorSubject<boolean>;

    const createService = createServiceFactory({
        service: AuthInterceptor,
        providers: [mockLoggerProvider()],
        mocks: [AuthService, CsrfService],
    });

    const createMockHandler = (response: unknown = { success: true }) => ({
        handle: jest
            .fn()
            .mockReturnValue(of(new HttpResponse({ body: response }))),
    });

    const createErrorHandler = (status: number, error: unknown = {}) => ({
        handle: jest
            .fn()
            .mockReturnValue(
                throwError(() => new HttpErrorResponse({ status, error }))
            ),
    });

    beforeEach(() => {
        spectator = createService();
        authService = spectator.inject(AuthService) as jest.Mocked<AuthService>;
        csrfService = spectator.inject(CsrfService) as jest.Mocked<CsrfService>;
        loggerService = spectator.inject(
            LoggerService
        ) as unknown as MockLoggerService;
        mockHandler = createMockHandler() as jest.Mocked<HttpHandler>;

        // Default mocks
        authOperationInProgress$ = new BehaviorSubject<boolean>(false);
        Object.defineProperty(authService, 'isAuthOperationInProgress$', {
            get: () => authOperationInProgress$.asObservable(),
        });
        csrfService.getCsrfToken.mockReturnValue(of('test-csrf-token'));
        csrfService.refreshCsrfToken.mockReturnValue(of('new-csrf-token'));
    });

    describe('Non-API requests', () => {
        it('should pass through non-API requests without modification', done => {
            const request = new HttpRequest(
                'GET',
                'https://external-site.com/data'
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    expect(mockHandler.handle).toHaveBeenCalledWith(request);
                    // Request should not be modified
                    const passedRequest = mockHandler.handle.mock.calls[0][0];
                    expect(passedRequest.withCredentials).toBe(false);
                    done();
                },
            });
        });
    });

    describe('API requests - credentials', () => {
        it('should add withCredentials to API requests starting with apiUrl', done => {
            const request = new HttpRequest('GET', 'http://test-api/api/users');

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    const passedRequest = mockHandler.handle.mock
                        .calls[0][0] as HttpRequest<unknown>;
                    expect(passedRequest.withCredentials).toBe(true);
                    done();
                },
            });
        });

        it('should add withCredentials to API requests starting with /api/', done => {
            const request = new HttpRequest('GET', '/api/users');

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    const passedRequest = mockHandler.handle.mock
                        .calls[0][0] as HttpRequest<unknown>;
                    expect(passedRequest.withCredentials).toBe(true);
                    done();
                },
            });
        });
    });

    describe('CSRF endpoint', () => {
        it('should skip CSRF token for /api/auth/csrf endpoint', done => {
            const request = new HttpRequest(
                'GET',
                'http://test-api/api/auth/csrf'
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    const passedRequest = mockHandler.handle.mock
                        .calls[0][0] as HttpRequest<unknown>;
                    expect(passedRequest.withCredentials).toBe(true);
                    expect(passedRequest.headers.has('X-CSRF-Token')).toBe(
                        false
                    );
                    expect(csrfService.getCsrfToken).not.toHaveBeenCalled();
                    done();
                },
            });
        });

        it('should skip CSRF token for POST to /api/auth/csrf endpoint', done => {
            const request = new HttpRequest(
                'POST',
                'http://test-api/api/auth/csrf',
                {}
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    const passedRequest = mockHandler.handle.mock
                        .calls[0][0] as HttpRequest<unknown>;
                    expect(passedRequest.headers.has('X-CSRF-Token')).toBe(
                        false
                    );
                    expect(csrfService.getCsrfToken).not.toHaveBeenCalled();
                    done();
                },
            });
        });

        it('should NOT match CSRF endpoint for similar URLs like /api/auth/csrf-test', done => {
            const request = new HttpRequest(
                'POST',
                'http://test-api/api/auth/csrf-test',
                {}
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    // This should NOT be treated as CSRF endpoint, so CSRF token should be added
                    expect(csrfService.getCsrfToken).toHaveBeenCalled();
                    done();
                },
            });
        });

        it('should NOT match CSRF endpoint for URLs with /api/auth/csrf as prefix', done => {
            const request = new HttpRequest(
                'POST',
                'http://test-api/api/auth/csrf/something',
                {}
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    // This should NOT be treated as CSRF endpoint
                    expect(csrfService.getCsrfToken).toHaveBeenCalled();
                    done();
                },
            });
        });

        it('should skip CSRF token for /api/auth/csrf with query parameters', done => {
            const request = new HttpRequest(
                'GET',
                'http://test-api/api/auth/csrf?timestamp=123'
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    // Should still match CSRF endpoint even with query params
                    expect(csrfService.getCsrfToken).not.toHaveBeenCalled();
                    done();
                },
            });
        });
    });

    describe('Auth endpoints (login/logout)', () => {
        it('should add CSRF token for login without waiting for auth operation', done => {
            // Start with auth operation in progress
            authOperationInProgress$.next(true);

            const request = new HttpRequest(
                'POST',
                'http://test-api/api/auth/login',
                { username: 'test', password: 'test' }
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    const passedRequest = mockHandler.handle.mock
                        .calls[0][0] as HttpRequest<unknown>;
                    expect(passedRequest.headers.get('X-CSRF-Token')).toBe(
                        'test-csrf-token'
                    );
                    expect(passedRequest.withCredentials).toBe(true);
                    done();
                },
            });
        });

        it('should add CSRF token for logout without waiting for auth operation', done => {
            // Start with auth operation in progress
            authOperationInProgress$.next(true);

            const request = new HttpRequest(
                'POST',
                'http://test-api/api/auth/logout',
                {}
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    const passedRequest = mockHandler.handle.mock
                        .calls[0][0] as HttpRequest<unknown>;
                    expect(passedRequest.headers.get('X-CSRF-Token')).toBe(
                        'test-csrf-token'
                    );
                    expect(passedRequest.withCredentials).toBe(true);
                    done();
                },
            });
        });

        it('should NOT match auth endpoint for similar URLs like /api/auth/login-test', done => {
            // Auth operation in progress - if it's NOT an auth endpoint, it should wait
            authOperationInProgress$.next(true);

            const request = new HttpRequest(
                'POST',
                'http://test-api/api/auth/login-test',
                {}
            );

            let requestCompleted = false;
            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    requestCompleted = true;
                    done();
                },
            });

            // Request should NOT have been sent yet because it's not an auth endpoint
            // and auth operation is in progress
            expect(mockHandler.handle).not.toHaveBeenCalled();
            expect(requestCompleted).toBe(false);

            // Complete the auth operation
            authOperationInProgress$.next(false);
        });

        it('should NOT match auth endpoint for URLs with /api/auth/logout as prefix', done => {
            // Auth operation in progress - if it's NOT an auth endpoint, it should wait
            authOperationInProgress$.next(true);

            const request = new HttpRequest(
                'POST',
                'http://test-api/api/auth/logout/session',
                {}
            );

            let requestCompleted = false;
            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    requestCompleted = true;
                    done();
                },
            });

            // Request should NOT have been sent yet
            expect(mockHandler.handle).not.toHaveBeenCalled();
            expect(requestCompleted).toBe(false);

            // Complete the auth operation
            authOperationInProgress$.next(false);
        });

        it('should match auth endpoint for login with query parameters', done => {
            // Auth operation in progress - auth endpoints should NOT wait
            authOperationInProgress$.next(true);

            const request = new HttpRequest(
                'POST',
                'http://test-api/api/auth/login?redirect=/dashboard',
                { username: 'test', password: 'test' }
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    // Should match auth endpoint even with query params, so no waiting
                    expect(mockHandler.handle).toHaveBeenCalled();
                    done();
                },
            });
        });
    });

    describe('GET requests', () => {
        it('should not add CSRF token for GET requests', done => {
            const request = new HttpRequest('GET', 'http://test-api/api/users');

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    const passedRequest = mockHandler.handle.mock
                        .calls[0][0] as HttpRequest<unknown>;
                    expect(passedRequest.headers.has('X-CSRF-Token')).toBe(
                        false
                    );
                    expect(csrfService.getCsrfToken).not.toHaveBeenCalled();
                    done();
                },
            });
        });
    });

    describe('State-changing requests (POST, PUT, DELETE, PATCH)', () => {
        const methods = ['POST', 'PUT', 'DELETE', 'PATCH'] as const;

        methods.forEach(method => {
            it(`should add CSRF token for ${method} requests`, done => {
                const request = new HttpRequest(
                    method,
                    'http://test-api/api/resource',
                    {}
                );

                spectator.service.intercept(request, mockHandler).subscribe({
                    next: () => {
                        const passedRequest = mockHandler.handle.mock
                            .calls[0][0] as HttpRequest<unknown>;
                        expect(passedRequest.headers.get('X-CSRF-Token')).toBe(
                            'test-csrf-token'
                        );
                        expect(csrfService.getCsrfToken).toHaveBeenCalled();
                        done();
                    },
                });
            });
        });

        it('should handle lowercase method names', done => {
            const request = new HttpRequest(
                'post' as 'POST',
                'http://test-api/api/resource',
                {}
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    expect(csrfService.getCsrfToken).toHaveBeenCalled();
                    done();
                },
            });
        });
    });

    describe('Auth operation queuing', () => {
        it('should wait for auth operation to complete before sending state-changing request', done => {
            // Start with auth operation in progress
            authOperationInProgress$.next(true);

            const request = new HttpRequest(
                'POST',
                'http://test-api/api/resource',
                {}
            );

            let requestCompleted = false;
            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    requestCompleted = true;
                    // Request should only complete after auth operation finishes
                    expect(mockHandler.handle).toHaveBeenCalled();
                    done();
                },
            });

            // Request should not have been sent yet
            expect(mockHandler.handle).not.toHaveBeenCalled();
            expect(requestCompleted).toBe(false);

            // Complete the auth operation
            authOperationInProgress$.next(false);
        });

        it('should send request immediately when no auth operation is in progress', done => {
            // Auth operation not in progress
            authOperationInProgress$.next(false);

            const request = new HttpRequest(
                'POST',
                'http://test-api/api/resource',
                {}
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    expect(mockHandler.handle).toHaveBeenCalled();
                    done();
                },
            });
        });

        it('should not queue GET requests during auth operation', done => {
            // Auth operation in progress
            authOperationInProgress$.next(true);

            const request = new HttpRequest('GET', 'http://test-api/api/users');

            spectator.service.intercept(request, mockHandler).subscribe({
                next: () => {
                    // GET request should be sent immediately
                    expect(mockHandler.handle).toHaveBeenCalled();
                    done();
                },
            });
        });
    });

    describe('CSRF token fetch failure', () => {
        it('should propagate error when CSRF token fetch fails', done => {
            const tokenError = new Error('Network error');
            csrfService.getCsrfToken.mockReturnValue(
                throwError(() => tokenError)
            );
            const request = new HttpRequest(
                'POST',
                'http://test-api/api/resource',
                {}
            );

            spectator.service.intercept(request, mockHandler).subscribe({
                error: error => {
                    expect(error).toBe(tokenError);
                    expect(loggerService.mockLogger.error).toHaveBeenCalledWith(
                        'Failed to get CSRF token',
                        tokenError
                    );
                    done();
                },
            });
        });
    });

    describe('CSRF validation failure (403) - single request', () => {
        it('should retry request with refreshed token on CSRF validation failure', done => {
            const request = new HttpRequest(
                'POST',
                'http://test-api/api/resource',
                {}
            );

            let callCount = 0;
            const handler: HttpHandler = {
                handle: jest
                    .fn()
                    .mockImplementation((req: HttpRequest<unknown>) => {
                        callCount++;
                        if (callCount === 1) {
                            // First call - CSRF error
                            return throwError(
                                () =>
                                    new HttpErrorResponse({
                                        status: 403,
                                        error: {
                                            errorCode: 'CSRF_VALIDATION_FAILED',
                                        },
                                    })
                            );
                        }
                        // Second call - success
                        return of(
                            new HttpResponse({ body: { success: true } })
                        );
                    }),
            };

            spectator.service.intercept(request, handler).subscribe({
                next: response => {
                    expect(csrfService.refreshCsrfToken).toHaveBeenCalled();
                    expect(handler.handle).toHaveBeenCalledTimes(2);

                    // Verify second request has new token
                    const retryRequest = (handler.handle as jest.Mock).mock
                        .calls[1][0] as HttpRequest<unknown>;
                    expect(retryRequest.headers.get('X-CSRF-Token')).toBe(
                        'new-csrf-token'
                    );
                    expect(retryRequest.withCredentials).toBe(true);
                    // Verify retry marker header is set
                    expect(retryRequest.headers.get('X-CSRF-Retry')).toBe(
                        'true'
                    );
                    done();
                },
            });
        });

        it('should NOT retry if request already has X-CSRF-Retry header (prevent infinite loops)', done => {
            // Create a request that already has the retry header (simulating a retried request)
            const request = new HttpRequest(
                'POST',
                'http://test-api/api/resource',
                {},
                {
                    headers: new (jest.requireActual(
                        '@angular/common/http'
                    ).HttpHeaders)({
                        'X-CSRF-Retry': 'true',
                    }),
                }
            );

            const handler = createErrorHandler(403, {
                errorCode: 'CSRF_VALIDATION_FAILED',
            });

            spectator.service
                .intercept(request, handler as HttpHandler)
                .subscribe({
                    error: (error: HttpErrorResponse) => {
                        // Should NOT retry - error should be propagated
                        expect(error.status).toBe(403);
                        expect(
                            csrfService.refreshCsrfToken
                        ).not.toHaveBeenCalled();
                        expect(handler.handle).toHaveBeenCalledTimes(1);
                        done();
                    },
                });
        });

        it('should not retry on 403 without CSRF_VALIDATION_FAILED errorCode', done => {
            const request = new HttpRequest(
                'POST',
                'http://test-api/api/resource',
                {}
            );
            const handler = createErrorHandler(403, {
                errorCode: 'ACCESS_DENIED',
            });

            spectator.service
                .intercept(request, handler as HttpHandler)
                .subscribe({
                    error: (error: HttpErrorResponse) => {
                        expect(error.status).toBe(403);
                        expect(
                            csrfService.refreshCsrfToken
                        ).not.toHaveBeenCalled();
                        done();
                    },
                });
        });

        it('should not retry CSRF failure for GET requests', done => {
            const request = new HttpRequest(
                'GET',
                'http://test-api/api/resource'
            );
            const handler = createErrorHandler(403, {
                errorCode: 'CSRF_VALIDATION_FAILED',
            });

            spectator.service
                .intercept(request, handler as HttpHandler)
                .subscribe({
                    error: (error: HttpErrorResponse) => {
                        expect(error.status).toBe(403);
                        expect(
                            csrfService.refreshCsrfToken
                        ).not.toHaveBeenCalled();
                        done();
                    },
                });
        });

        it('should return original error if token refresh fails', done => {
            const request = new HttpRequest(
                'POST',
                'http://test-api/api/resource',
                {}
            );
            const originalError = new HttpErrorResponse({
                status: 403,
                error: { errorCode: 'CSRF_VALIDATION_FAILED' },
            });
            const handler = {
                handle: jest
                    .fn()
                    .mockReturnValue(throwError(() => originalError)),
            };
            csrfService.refreshCsrfToken.mockReturnValue(
                throwError(() => new Error('Refresh failed'))
            );

            spectator.service
                .intercept(request, handler as HttpHandler)
                .subscribe({
                    error: (error: HttpErrorResponse) => {
                        expect(error.status).toBe(403);
                        expect(error.error.errorCode).toBe(
                            'CSRF_VALIDATION_FAILED'
                        );
                        done();
                    },
                });
        });
    });

    describe('Concurrent CSRF failures - shared token refresh', () => {
        it('should share token refresh for concurrent CSRF failures', done => {
            const tokenSubject = new Subject<string>();
            csrfService.refreshCsrfToken.mockReturnValue(
                tokenSubject.asObservable().pipe(take(1))
            );

            const request1 = new HttpRequest(
                'POST',
                'http://test-api/api/resource1',
                {}
            );
            const request2 = new HttpRequest(
                'POST',
                'http://test-api/api/resource2',
                {}
            );

            let handler1CallCount = 0;
            let handler2CallCount = 0;

            const handler1: HttpHandler = {
                handle: jest.fn().mockImplementation(() => {
                    handler1CallCount++;
                    if (handler1CallCount === 1) {
                        return throwError(
                            () =>
                                new HttpErrorResponse({
                                    status: 403,
                                    error: {
                                        errorCode: 'CSRF_VALIDATION_FAILED',
                                    },
                                })
                        );
                    }
                    return of(new HttpResponse({ body: { id: 1 } }));
                }),
            };

            const handler2: HttpHandler = {
                handle: jest.fn().mockImplementation(() => {
                    handler2CallCount++;
                    if (handler2CallCount === 1) {
                        return throwError(
                            () =>
                                new HttpErrorResponse({
                                    status: 403,
                                    error: {
                                        errorCode: 'CSRF_VALIDATION_FAILED',
                                    },
                                })
                        );
                    }
                    return of(new HttpResponse({ body: { id: 2 } }));
                }),
            };

            let completedCount = 0;
            const checkComplete = () => {
                completedCount++;
                if (completedCount === 2) {
                    // refreshCsrfToken should only be called once
                    expect(csrfService.refreshCsrfToken).toHaveBeenCalledTimes(
                        1
                    );

                    // Both retry requests should have the same new token
                    const retry1 = (handler1.handle as jest.Mock).mock
                        .calls[1][0] as HttpRequest<unknown>;
                    const retry2 = (handler2.handle as jest.Mock).mock
                        .calls[1][0] as HttpRequest<unknown>;
                    expect(retry1.headers.get('X-CSRF-Token')).toBe(
                        'shared-new-token'
                    );
                    expect(retry2.headers.get('X-CSRF-Token')).toBe(
                        'shared-new-token'
                    );
                    done();
                }
            };

            // Start both requests
            spectator.service
                .intercept(request1, handler1)
                .subscribe({ next: checkComplete });
            spectator.service
                .intercept(request2, handler2)
                .subscribe({ next: checkComplete });

            // Emit the new token for both waiting requests
            tokenSubject.next('shared-new-token');
            tokenSubject.complete();
        });
    });

    describe('Other HTTP errors', () => {
        it('should propagate 401 errors', done => {
            const request = new HttpRequest(
                'GET',
                'http://test-api/api/resource'
            );
            const handler = createErrorHandler(401, {
                message: 'Unauthorized',
            });

            spectator.service
                .intercept(request, handler as HttpHandler)
                .subscribe({
                    error: (error: HttpErrorResponse) => {
                        expect(error.status).toBe(401);
                        done();
                    },
                });
        });

        it('should propagate 500 errors', done => {
            const request = new HttpRequest(
                'POST',
                'http://test-api/api/resource',
                {}
            );
            const handler = createErrorHandler(500, {
                message: 'Server error',
            });

            spectator.service
                .intercept(request, handler as HttpHandler)
                .subscribe({
                    error: (error: HttpErrorResponse) => {
                        expect(error.status).toBe(500);
                        done();
                    },
                });
        });

        it('should propagate network errors (status 0)', done => {
            const request = new HttpRequest(
                'GET',
                'http://test-api/api/resource'
            );
            const handler = createErrorHandler(0);

            spectator.service
                .intercept(request, handler as HttpHandler)
                .subscribe({
                    error: (error: HttpErrorResponse) => {
                        expect(error.status).toBe(0);
                        done();
                    },
                });
        });
    });

    describe('authInterceptorProvider', () => {
        it('should provide correct configuration', () => {
            expect(authInterceptorProvider.provide.toString()).toContain(
                'HTTP_INTERCEPTORS'
            );
            expect(authInterceptorProvider.useClass).toBe(AuthInterceptor);
            expect(authInterceptorProvider.multi).toBe(true);
        });
    });
});
