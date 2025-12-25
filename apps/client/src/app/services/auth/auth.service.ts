import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import {
    map,
    catchError,
    tap,
    finalize,
    switchMap,
    take,
} from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, AuthState, AuthResponse, LoginRequest } from '@drevo-web/shared';
import { CsrfService } from './csrf.service';
import { LoggerService } from '../logger/logger.service';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly apiUrl = environment.apiUrl;
    private readonly isBrowser: boolean;

    // Auth state
    private readonly userSubject = new BehaviorSubject<User | null>(null);
    private readonly isLoadingSubject = new BehaviorSubject<boolean>(true);
    private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(
        false
    );

    // Lock for auth operations (login/logout)
    private readonly authOperationInProgressSubject =
        new BehaviorSubject<boolean>(false);

    // Public observables
    readonly user$ = this.userSubject.asObservable();
    readonly isLoading$ = this.isLoadingSubject.asObservable();
    readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
    readonly isAuthOperationInProgress$ =
        this.authOperationInProgressSubject.asObservable();

    // Auth state as combined observable
    readonly authState$: Observable<AuthState> = this.user$.pipe(
        map(user => ({
            isAuthenticated: !!user,
            user,
            isLoading: this.isLoadingSubject.value,
        }))
    );

    private readonly http = inject(HttpClient);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly csrfService = inject(CsrfService);
    private readonly logger = inject(LoggerService);

    constructor() {
        this.isBrowser = isPlatformBrowser(this.platformId);

        if (this.isBrowser) {
            // Initialize CSRF service with HttpClient
            this.csrfService.setHttpClient(this.http);
            this.csrfService.initCsrfToken();
            this.checkAuth().pipe(take(1)).subscribe();
        } else {
            // SSR: return guest state
            this.isLoadingSubject.next(false);
        }
    }

    /**
     * Check current authentication status
     */
    checkAuth(): Observable<AuthState> {
        if (!this.isBrowser) {
            return of({
                isAuthenticated: false,
                user: null,
                isLoading: false,
            });
        }

        this.isLoadingSubject.next(true);

        return this.http
            .get<AuthResponse>(`${this.apiUrl}/api/auth/me`, {
                withCredentials: true,
            })
            .pipe(
                map(response => {
                    if (
                        response.success &&
                        response.data?.isAuthenticated &&
                        response.data.user
                    ) {
                        this.userSubject.next(response.data.user);
                        this.isAuthenticatedSubject.next(true);
                        return {
                            isAuthenticated: true,
                            user: response.data.user,
                            isLoading: false,
                        };
                    }
                    this.userSubject.next(null);
                    this.isAuthenticatedSubject.next(false);
                    return {
                        isAuthenticated: false,
                        user: null,
                        isLoading: false,
                    };
                }),
                catchError(error => {
                    this.logger.error(
                        'Auth check failed',
                        'AuthService',
                        error
                    );
                    this.userSubject.next(null);
                    this.isAuthenticatedSubject.next(false);
                    return of({
                        isAuthenticated: false,
                        user: null,
                        isLoading: false,
                    });
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
    }

    /**
     * Login with username and password
     */
    login(request: LoginRequest): Observable<User> {
        if (!this.isBrowser) {
            return throwError(
                () => new Error('Login is only available in browser')
            );
        }

        // Set lock
        this.authOperationInProgressSubject.next(true);

        return this.csrfService.csrfToken$.pipe(
            switchMap(csrfToken =>
                this.http.post<AuthResponse>(
                    `${this.apiUrl}/api/auth/login`,
                    request,
                    {
                        withCredentials: true,
                        headers: {
                            'X-CSRF-Token': csrfToken,
                        },
                    }
                )
            ),
            map(response => {
                if (response.success && response.data?.user) {
                    // Update CSRF token from response
                    if (response.data.csrfToken) {
                        this.csrfService.updateCsrfToken(
                            response.data.csrfToken
                        );
                    }

                    this.userSubject.next(response.data.user);
                    this.isAuthenticatedSubject.next(true);
                    return response.data.user;
                }
                throw new Error(response.error || 'Login failed');
            }),
            catchError((error: HttpErrorResponse) => {
                const errorMessage =
                    error.error?.error || error.message || 'Login failed';
                const errorCode = error.error?.errorCode;
                return throwError(() => ({
                    message: errorMessage,
                    code: errorCode,
                }));
            }),
            finalize(() => this.authOperationInProgressSubject.next(false))
        );
    }

    /**
     * Logout current user
     */
    logout(): Observable<void> {
        if (!this.isBrowser) {
            return of(void 0);
        }

        // Set lock
        this.authOperationInProgressSubject.next(true);

        return this.csrfService.csrfToken$.pipe(
            switchMap(csrfToken =>
                this.http.post<AuthResponse>(
                    `${this.apiUrl}/api/auth/logout`,
                    {},
                    {
                        withCredentials: true,
                        headers: {
                            'X-CSRF-Token': csrfToken,
                        },
                    }
                )
            ),
            tap(() => {
                this.userSubject.next(null);
                this.isAuthenticatedSubject.next(false);
            }),
            switchMap(() => this.csrfService.refreshCsrfToken()),
            map(() => void 0),
            catchError(error => {
                this.logger.error('Logout failed', 'AuthService', error);
                // Still clear local state even if server request fails
                this.userSubject.next(null);
                this.isAuthenticatedSubject.next(false);
                return of(void 0);
            }),
            finalize(() => this.authOperationInProgressSubject.next(false))
        );
    }

    /**
     * Get current user synchronously (may be null during loading)
     */
    get currentUser(): User | null {
        return this.userSubject.value;
    }

    /**
     * Check if user is authenticated synchronously
     */
    get isAuthenticated(): boolean {
        return this.isAuthenticatedSubject.value;
    }
}
