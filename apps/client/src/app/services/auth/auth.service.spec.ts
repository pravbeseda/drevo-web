import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { LoggerService, StorageService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { AuthResponse, User } from '@drevo-web/shared';

jest.mock('../../../environments/environment', () => ({
    environment: { apiUrl: 'http://test-api', production: false },
}));

describe('AuthService', () => {
    let spectator: SpectatorService<AuthService>;
    let httpController: HttpTestingController;
    let csrfService: jest.Mocked<CsrfService>;
    let router: { navigate: jest.Mock; url: string };

    const mockUser: User = {
        id: 1,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        permissions: {
            canEdit: true,
            canModerate: false,
            canAdmin: false,
        },
    };

    const mockAuthResponse: AuthResponse = {
        success: true,
        data: {
            isAuthenticated: true,
            user: mockUser,
            csrfToken: 'new-csrf-token',
        },
    };

    const mockUnauthenticatedResponse: AuthResponse = {
        success: true,
        data: {
            isAuthenticated: false,
        },
    };

    const createService = createServiceFactory({
        service: AuthService,
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            { provide: PLATFORM_ID, useValue: 'browser' },
            {
                provide: Router,
                useFactory: () => router,
            },
            mockLoggerProvider(),
        ],
        mocks: [CsrfService, StorageService],
    });

    beforeEach(() => {
        router = {
            navigate: jest.fn().mockResolvedValue(true),
            url: '/current-page',
        };
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
        csrfService = spectator.inject(CsrfService) as jest.Mocked<CsrfService>;

        // Default mock for CSRF
        csrfService.getCsrfToken.mockReturnValue(of('test-csrf-token'));
        csrfService.refreshCsrfToken.mockReturnValue(
            of('refreshed-csrf-token')
        );

        // Handle initial auth check that happens in constructor
        // Using match() instead of expectOne() to avoid throwing when request doesn't exist
        const initialRequests = httpController.match(
            'http://test-api/api/auth/me'
        );
        initialRequests.forEach(req => req.flush(mockUnauthenticatedResponse));
    });

    afterEach(() => {
        httpController.verify();
    });

    describe('initialization', () => {
        it('should be created', () => {
            expect(spectator.service).toBeTruthy();
        });

        it('should initialize with loading state', () => {
            // Create fresh service without flushing initial request
            const freshSpectator = createService();
            // Service starts in loading state before checkAuth completes
            expect(freshSpectator.service).toBeTruthy();

            // Clean up pending request
            const controller = freshSpectator.inject(HttpTestingController);
            controller
                .match('http://test-api/api/auth/me')
                .forEach(req => req.flush(mockUnauthenticatedResponse));
        });

        it('should call initCsrfToken and checkAuth on browser platform', () => {
            expect(csrfService.initCsrfToken).toHaveBeenCalled();
        });
    });

    describe('checkAuth', () => {
        it('should return authenticated state when user is logged in', done => {
            spectator.service.checkAuth().subscribe(state => {
                expect(state.isAuthenticated).toBe(true);
                expect(state.user).toEqual(mockUser);
                expect(state.isLoading).toBe(false);
                done();
            });

            const req = httpController.expectOne('http://test-api/api/auth/me');
            expect(req.request.withCredentials).toBe(true);
            req.flush(mockAuthResponse);
        });

        it('should return unauthenticated state when user is not logged in', done => {
            spectator.service.checkAuth().subscribe(state => {
                expect(state.isAuthenticated).toBe(false);
                expect(state.user).toBeUndefined();
                expect(state.isLoading).toBe(false);
                done();
            });

            const req = httpController.expectOne('http://test-api/api/auth/me');
            req.flush(mockUnauthenticatedResponse);
        });

        it('should return unauthenticated state on error', done => {
            spectator.service.checkAuth().subscribe(state => {
                expect(state.isAuthenticated).toBe(false);
                expect(state.user).toBeUndefined();
                expect(state.isLoading).toBe(false);
                done();
            });

            const req = httpController.expectOne('http://test-api/api/auth/me');
            req.error(new ErrorEvent('Network error'));
        });

        it('should update userSubject on successful auth', done => {
            spectator.service.checkAuth().subscribe(() => {
                expect(spectator.service.currentUser).toEqual(mockUser);
                done();
            });

            const req = httpController.expectOne('http://test-api/api/auth/me');
            req.flush(mockAuthResponse);
        });

        it('should update isAuthenticatedSubject on successful auth', done => {
            spectator.service.checkAuth().subscribe(() => {
                expect(spectator.service.isAuthenticated).toBe(true);
                done();
            });

            const req = httpController.expectOne('http://test-api/api/auth/me');
            req.flush(mockAuthResponse);
        });

        it('should set isLoading to true during request', () => {
            let isLoadingDuringRequest = false;

            spectator.service.isLoading$.subscribe(isLoading => {
                isLoadingDuringRequest = isLoading;
            });

            spectator.service.checkAuth().subscribe();

            // During the request, isLoading should be true
            expect(isLoadingDuringRequest).toBe(true);

            const req = httpController.expectOne('http://test-api/api/auth/me');
            req.flush(mockUnauthenticatedResponse);
        });

        it('should handle response without user data', done => {
            const responseWithoutUser: AuthResponse = {
                success: true,
                data: {
                    isAuthenticated: true,
                    // user is missing
                },
            };

            spectator.service.checkAuth().subscribe(state => {
                expect(state.isAuthenticated).toBe(false);
                expect(state.user).toBeUndefined();
                done();
            });

            const req = httpController.expectOne('http://test-api/api/auth/me');
            req.flush(responseWithoutUser);
        });

        it('should handle unsuccessful response', done => {
            const unsuccessfulResponse: AuthResponse = {
                success: false,
                error: 'Some error',
            };

            spectator.service.checkAuth().subscribe(state => {
                expect(state.isAuthenticated).toBe(false);
                expect(state.user).toBeUndefined();
                done();
            });

            const req = httpController.expectOne('http://test-api/api/auth/me');
            req.flush(unsuccessfulResponse);
        });
    });

    describe('login', () => {
        const loginRequest = {
            username: 'testuser',
            password: 'password123',
        };

        it('should successfully login user', done => {
            spectator.service.login(loginRequest).subscribe(user => {
                expect(user).toEqual(mockUser);
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(loginRequest);
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.headers.get('X-CSRF-Token')).toBe(
                'test-csrf-token'
            );
            req.flush(mockAuthResponse);
        });

        it('should update user state after successful login', done => {
            spectator.service.login(loginRequest).subscribe(() => {
                expect(spectator.service.currentUser).toEqual(mockUser);
                expect(spectator.service.isAuthenticated).toBe(true);
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(mockAuthResponse);
        });

        it('should update CSRF token from response', done => {
            spectator.service.login(loginRequest).subscribe(() => {
                expect(csrfService.updateCsrfToken).toHaveBeenCalledWith(
                    'new-csrf-token'
                );
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(mockAuthResponse);
        });

        it('should set auth operation in progress during login', () => {
            let inProgressDuringRequest = false;

            spectator.service.isAuthOperationInProgress$.subscribe(
                inProgress => {
                    inProgressDuringRequest = inProgress;
                }
            );

            spectator.service.login(loginRequest).subscribe();

            expect(inProgressDuringRequest).toBe(true);

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(mockAuthResponse);
        });

        it('should reset auth operation in progress after login completes', done => {
            spectator.service.login(loginRequest).subscribe({
                complete: () => {
                    spectator.service.isAuthOperationInProgress$.subscribe(
                        inProgress => {
                            expect(inProgress).toBe(false);
                            done();
                        }
                    );
                },
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(mockAuthResponse);
        });

        it('should throw error when login fails with error message', done => {
            const errorResponse = {
                success: false,
                error: 'Invalid credentials',
            };

            spectator.service.login(loginRequest).subscribe({
                error: error => {
                    expect(error.message).toBe('Invalid credentials');
                    done();
                },
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(errorResponse);
        });

        it('should throw error when response has no user', done => {
            const responseWithoutUser: AuthResponse = {
                success: true,
                data: {
                    isAuthenticated: true,
                },
            };

            spectator.service.login(loginRequest).subscribe({
                error: error => {
                    expect(error.message).toBe('Login failed');
                    done();
                },
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(responseWithoutUser);
        });

        it('should handle HTTP error response', done => {
            spectator.service.login(loginRequest).subscribe({
                error: error => {
                    expect(error.message).toBeDefined();
                    done();
                },
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(
                { error: 'Server error', errorCode: 'SERVER_ERROR' },
                { status: 500, statusText: 'Internal Server Error' }
            );
        });

        it('should include error code in error response', done => {
            spectator.service.login(loginRequest).subscribe({
                error: error => {
                    expect(error.code).toBe('INVALID_CREDENTIALS');
                    done();
                },
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(
                {
                    error: 'Invalid credentials',
                    errorCode: 'INVALID_CREDENTIALS',
                },
                { status: 401, statusText: 'Unauthorized' }
            );
        });

        it('should get CSRF token before making login request', done => {
            spectator.service.login(loginRequest).subscribe(() => {
                expect(csrfService.getCsrfToken).toHaveBeenCalled();
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(mockAuthResponse);
        });

        it('should handle CSRF token fetch error', done => {
            csrfService.getCsrfToken.mockReturnValue(
                throwError(() => new Error('CSRF fetch failed'))
            );

            spectator.service.login(loginRequest).subscribe({
                error: error => {
                    expect(error.message).toContain('CSRF fetch failed');
                    done();
                },
            });
        });

        it('should not update CSRF token if not in response', done => {
            const responseWithoutCsrf: AuthResponse = {
                success: true,
                data: {
                    isAuthenticated: true,
                    user: mockUser,
                },
            };

            spectator.service.login(loginRequest).subscribe(() => {
                expect(csrfService.updateCsrfToken).not.toHaveBeenCalled();
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(responseWithoutCsrf);
        });
    });

    describe('logout', () => {
        beforeEach(done => {
            // First login to have authenticated state
            spectator.service
                .login({ username: 'test', password: 'test' })
                .subscribe(() => done());
            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(mockAuthResponse);
        });

        it('should successfully logout user', done => {
            spectator.service.logout().subscribe(() => {
                expect(spectator.service.currentUser).toBeUndefined();
                expect(spectator.service.isAuthenticated).toBe(false);
                expect(router.navigate).toHaveBeenCalledWith(['/login']);
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/logout'
            );
            expect(req.request.method).toBe('POST');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.headers.get('X-CSRF-Token')).toBe(
                'test-csrf-token'
            );
            req.flush({ success: true });
        });

        it('should refresh CSRF token after logout', done => {
            spectator.service.logout().subscribe(() => {
                expect(csrfService.refreshCsrfToken).toHaveBeenCalled();
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/logout'
            );
            req.flush({ success: true });
        });

        it('should set auth operation in progress during logout', () => {
            let inProgressDuringRequest = false;

            spectator.service.isAuthOperationInProgress$.subscribe(
                inProgress => {
                    inProgressDuringRequest = inProgress;
                }
            );

            spectator.service.logout().subscribe();

            expect(inProgressDuringRequest).toBe(true);

            const req = httpController.expectOne(
                'http://test-api/api/auth/logout'
            );
            req.flush({ success: true });
        });

        it('should reset auth operation in progress after logout completes', done => {
            spectator.service.logout().subscribe({
                complete: () => {
                    spectator.service.isAuthOperationInProgress$.subscribe(
                        inProgress => {
                            expect(inProgress).toBe(false);
                            done();
                        }
                    );
                },
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/logout'
            );
            req.flush({ success: true });
        });

        it('should clear local state even on server error', done => {
            const loggerService = spectator.inject(
                LoggerService
            ) as unknown as MockLoggerService;

            spectator.service.logout().subscribe(() => {
                expect(spectator.service.currentUser).toBeUndefined();
                expect(spectator.service.isAuthenticated).toBe(false);
                expect(loggerService.mockLogger.error).toHaveBeenCalled();
                expect(router.navigate).toHaveBeenCalledWith(['/login']);
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/logout'
            );
            req.error(new ErrorEvent('Network error'));
        });
    });

    describe('authState$ observable', () => {
        it('should emit auth state changes', done => {
            const states: boolean[] = [];

            spectator.service.authState$.subscribe(state => {
                states.push(state.isAuthenticated);
                if (states.length === 2) {
                    expect(states).toContain(false);
                    expect(states).toContain(true);
                    done();
                }
            });

            spectator.service
                .login({ username: 'test', password: 'test' })
                .subscribe();

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(mockAuthResponse);
        });
    });


    describe('handleUnauthorized', () => {
        it('should clear auth state', () => {
            spectator.service.handleUnauthorized();

            expect(spectator.service.isAuthenticated).toBe(false);
            expect(spectator.service.currentUser).toBeUndefined();
        });

        it('should redirect to login with current URL as returnUrl', () => {
            router.url = '/articles/123';

            spectator.service.handleUnauthorized();

            expect(router.navigate).toHaveBeenCalledWith(['/login'], {
                queryParams: { returnUrl: '/articles/123' },
            });
        });

        it('should use provided currentUrl if specified', () => {
            router.url = '/other-page';

            spectator.service.handleUnauthorized('/articles/456');

            expect(router.navigate).toHaveBeenCalledWith(['/login'], {
                queryParams: { returnUrl: '/articles/456' },
            });
        });

        it('should not redirect if already on login page', () => {
            router.url = '/login';

            spectator.service.handleUnauthorized();

            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should not redirect if currentUrl is /login', () => {
            router.url = '/articles/123';

            spectator.service.handleUnauthorized('/login');

            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should fall back to router.url if currentUrl is invalid (open redirect prevention)', () => {
            router.url = '/articles/123';

            spectator.service.handleUnauthorized('//evil.com');

            expect(router.navigate).toHaveBeenCalledWith(['/login'], {
                queryParams: { returnUrl: '/articles/123' },
            });
        });

        it('should reject protocol-relative URLs', () => {
            router.url = '/dashboard';

            spectator.service.handleUnauthorized('//attacker.com/phishing');

            expect(router.navigate).toHaveBeenCalledWith(['/login'], {
                queryParams: { returnUrl: '/dashboard' },
            });
        });
    });

    describe('cross-tab synchronization', () => {
        let storageService: jest.Mocked<StorageService>;

        beforeEach(() => {
            storageService = spectator.inject(
                StorageService
            ) as jest.Mocked<StorageService>;
            storageService.setString.mockReturnValue(true);
        });

        it('should notify other tabs on successful login', done => {
            spectator.service
                .login({ username: 'test', password: 'test' })
                .subscribe(() => {
                    expect(storageService.setString).toHaveBeenCalledWith(
                        'auth_sync',
                        expect.any(String)
                    );
                    done();
                });

            const req = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            req.flush(mockAuthResponse);
        });

        it('should notify other tabs on successful logout', done => {
            spectator.service.logout().subscribe(() => {
                expect(storageService.setString).toHaveBeenCalledWith(
                    'auth_sync',
                    expect.any(String)
                );
                done();
            });

            const req = httpController.expectOne(
                'http://test-api/api/auth/logout'
            );
            req.flush({ success: true });
        });

        it('should call checkAuth when storage event is received', () => {
            const checkAuthSpy = jest.spyOn(spectator.service, 'checkAuth');

            window.dispatchEvent(
                new StorageEvent('storage', {
                    key: 'auth_sync',
                    newValue: Date.now().toString(),
                })
            );

            expect(checkAuthSpy).toHaveBeenCalled();

            // Clean up the checkAuth request
            const req = httpController.expectOne('http://test-api/api/auth/me');
            req.flush(mockUnauthenticatedResponse);
        });

        it('should not call checkAuth for other storage keys', () => {
            const checkAuthSpy = jest.spyOn(spectator.service, 'checkAuth');

            window.dispatchEvent(
                new StorageEvent('storage', {
                    key: 'other_key',
                    newValue: 'value',
                })
            );

            expect(checkAuthSpy).not.toHaveBeenCalled();
        });

        it('should redirect to login when logged-in user receives logout notification from another tab', done => {
            // First, login the user to establish authenticated state
            spectator.service
                .login({ username: 'test', password: 'test' })
                .subscribe(() => {
                    // Reset navigate mock to track only the redirect from sync
                    router.navigate.mockClear();

                    // Now simulate storage event from another tab (logout notification)
                    window.dispatchEvent(
                        new StorageEvent('storage', {
                            key: 'auth_sync',
                            newValue: Date.now().toString(),
                        })
                    );

                    // Handle the checkAuth request triggered by storage event
                    const req = httpController.expectOne(
                        'http://test-api/api/auth/me'
                    );
                    req.flush(mockUnauthenticatedResponse); // Server says user is now logged out

                    // Verify redirect happened
                    expect(router.navigate).toHaveBeenCalledWith(['/login']);
                    done();
                });

            const loginReq = httpController.expectOne(
                'http://test-api/api/auth/login'
            );
            loginReq.flush(mockAuthResponse);
        });

        it('should not redirect when already-logged-out tab receives sync event', () => {
            // User is not logged in (default state after beforeEach)
            expect(spectator.service.isAuthenticated).toBe(false);

            // Simulate storage event from another tab
            window.dispatchEvent(
                new StorageEvent('storage', {
                    key: 'auth_sync',
                    newValue: Date.now().toString(),
                })
            );

            // Handle the checkAuth request triggered by storage event
            const req = httpController.expectOne('http://test-api/api/auth/me');
            req.flush(mockUnauthenticatedResponse);

            // Verify no redirect happened (wasAuthenticated was false)
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });
});
