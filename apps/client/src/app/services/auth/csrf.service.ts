import { Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import {
    map,
    catchError,
    tap,
    timeout,
    retry,
    shareReplay,
} from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CsrfResponse } from '@drevo-web/shared';
import { LoggerService } from '@drevo-web/core';

const CSRF_TIMEOUT_MS = 10000;
const CSRF_RETRY_COUNT = 3;

/**
 * Separate service for CSRF token management to avoid circular dependency
 * between AuthInterceptor and AuthService.
 *
 * Uses Injector to lazily retrieve HttpClient, breaking the circular dependency:
 * HttpClient → AuthInterceptor → CsrfService → HttpClient
 */
@Injectable({
    providedIn: 'root',
})
export class CsrfService {
    private readonly apiUrl = environment.apiUrl;
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
    private readonly logger = inject(LoggerService).withContext('CsrfService');
    private readonly injector = inject(Injector);

    private csrfToken: string | undefined;
    private fetchInProgress$: Observable<string> | undefined;
    private _httpClient: HttpClient | undefined;

    /**
     * Lazily get HttpClient to avoid circular dependency
     */
    private get httpClient(): HttpClient {
        if (!this._httpClient) {
            this._httpClient = this.injector.get(HttpClient);
        }
        return this._httpClient;
    }

    getCsrfToken(): Observable<string> {
        if (this.csrfToken) {
            return of(this.csrfToken);
        }

        if (this.fetchInProgress$) {
            return this.fetchInProgress$;
        }

        return this.fetchCsrfToken();
    }

    initCsrfToken(): void {
        if (!this.isBrowser || this.csrfToken || this.fetchInProgress$) {
            return;
        }
        this.fetchCsrfToken().subscribe();
    }

    private fetchCsrfToken(): Observable<string> {
        this.fetchInProgress$ = this.httpClient
            .get<CsrfResponse>(`${this.apiUrl}/api/auth/csrf`, {
                withCredentials: true,
            })
            .pipe(
                timeout(CSRF_TIMEOUT_MS),
                retry(CSRF_RETRY_COUNT),
                map(response => {
                    if (response.success && response.data?.csrfToken) {
                        return response.data.csrfToken;
                    }
                    throw new Error('Invalid CSRF response');
                }),
                tap(token => {
                    this.csrfToken = token;
                    this.fetchInProgress$ = undefined;
                }),
                catchError(error => {
                    this.logger.error('Failed to fetch CSRF token', error);
                    this.fetchInProgress$ = undefined;
                    return throwError(() => error);
                }),
                shareReplay(1)
            );

        return this.fetchInProgress$;
    }

    refreshCsrfToken(): Observable<string> {
        this.clearToken();
        return this.fetchCsrfToken();
    }

    updateCsrfToken(token: string): void {
        this.csrfToken = token;
    }

    private clearToken(): void {
        this.csrfToken = undefined;
        this.fetchInProgress$ = undefined;
    }
}
