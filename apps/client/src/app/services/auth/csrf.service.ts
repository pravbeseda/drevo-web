import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
    Observable,
    ReplaySubject,
    throwError,
} from 'rxjs';
import {
    map,
    catchError,
    tap,
    timeout,
    retry,
    take,
} from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CsrfResponse } from '@drevo-web/shared';

const CSRF_TIMEOUT_MS = 10000;
const CSRF_RETRY_COUNT = 3;

/**
 * Separate service for CSRF token management to avoid circular dependency
 * between AuthInterceptor and AuthService
 */
@Injectable({
    providedIn: 'root',
})
export class CsrfService {
    private readonly apiUrl = environment.apiUrl;
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    // CSRF token management
    private readonly csrfTokenSubject = new ReplaySubject<string>(1);
    private csrfTokenInitialized = false;
    private httpClient: HttpClient | null = null;

    /**
     * Set HttpClient (called from AuthService to avoid circular dependency)
     */
    setHttpClient(http: HttpClient): void {
        this.httpClient = http;
    }

    /**
     * Get CSRF token observable (waits for token to be available)
     */
    get csrfToken$(): Observable<string> {
        return this.csrfTokenSubject.pipe(
            take(1),
            timeout(CSRF_TIMEOUT_MS)
        );
    }

    /**
     * Initialize CSRF token on app start
     */
    initCsrfToken(): void {
        if (!this.isBrowser || this.csrfTokenInitialized || !this.httpClient) {
            return;
        }
        this.csrfTokenInitialized = true;
        this.fetchCsrfToken().subscribe();
    }

    /**
     * Fetch CSRF token from server
     */
    private fetchCsrfToken(): Observable<string> {
        if (!this.httpClient) {
            return throwError(() => new Error('HttpClient not initialized'));
        }

        return this.httpClient
            .get<CsrfResponse>(`${this.apiUrl}/api/auth/csrf`, {
                withCredentials: true,
            })
            .pipe(
                timeout(CSRF_TIMEOUT_MS),
                retry(CSRF_RETRY_COUNT),
                map((response) => {
                    if (response.success && response.data?.csrfToken) {
                        return response.data.csrfToken;
                    }
                    throw new Error('Invalid CSRF response');
                }),
                tap((token) => this.csrfTokenSubject.next(token)),
                catchError((error) => {
                    console.error('Failed to fetch CSRF token:', error);
                    this.csrfTokenSubject.error(error);
                    return throwError(() => error);
                })
            );
    }

    /**
     * Refresh CSRF token (after logout or on 403)
     */
    refreshCsrfToken(): Observable<string> {
        if (!this.httpClient) {
            return throwError(() => new Error('HttpClient not initialized'));
        }

        return this.httpClient
            .get<CsrfResponse>(`${this.apiUrl}/api/auth/csrf`, {
                withCredentials: true,
            })
            .pipe(
                timeout(CSRF_TIMEOUT_MS),
                retry(CSRF_RETRY_COUNT),
                map((response) => {
                    if (response.success && response.data?.csrfToken) {
                        return response.data.csrfToken;
                    }
                    throw new Error('Invalid CSRF response');
                }),
                tap((token) => this.csrfTokenSubject.next(token)),
                catchError((error) => {
                    console.error('Failed to refresh CSRF token:', error);
                    return throwError(() => error);
                })
            );
    }

    /**
     * Update CSRF token (called after login with new token from response)
     */
    updateCsrfToken(token: string): void {
        this.csrfTokenSubject.next(token);
    }
}
