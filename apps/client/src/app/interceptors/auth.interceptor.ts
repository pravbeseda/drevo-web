import { Injectable, inject, Injector } from '@angular/core';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpErrorResponse,
    HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import {
    catchError,
    filter,
    finalize,
    shareReplay,
    switchMap,
    take,
} from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';
import { CsrfService } from '../services/auth/csrf.service';
import { LoggerService } from '@drevo-web/core';
import { environment } from '../../environments/environment';

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
const CSRF_ENDPOINTS = ['/api/auth/csrf'];
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/logout'];

// Custom header to mark requests that have already been retried for CSRF
const CSRF_RETRY_HEADER = 'X-CSRF-Retry';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private readonly apiUrl = environment.apiUrl;
    private readonly injector = inject(Injector);
    private readonly csrfService = inject(CsrfService);
    private readonly logger = inject(LoggerService).withContext('AuthInterceptor');

    // Lazy-loaded to avoid circular dependency (AuthService -> HttpClient -> HTTP_INTERCEPTORS)
    private _authService: AuthService | undefined;
    private get authService(): AuthService {
        if (!this._authService) {
            this._authService = this.injector.get(AuthService);
        }
        return this._authService;
    }

    // Shared observable for token refresh to handle concurrent CSRF failures
    private refreshingToken$: Observable<string> | undefined;

    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        // Only intercept API requests
        if (!this.isApiRequest(request.url)) {
            return next.handle(request);
        }

        // Skip CSRF token endpoint
        if (this.isCsrfEndpoint(request.url)) {
            return next.handle(this.addCredentials(request));
        }

        // Add credentials to all API requests
        request = this.addCredentials(request);

        // For GET requests, just add credentials
        if (!this.isStateChangingMethod(request.method)) {
            return next
                .handle(request)
                .pipe(
                    catchError(error => this.handleError(error, request, next))
                );
        }

        // For auth endpoints (login/logout), add CSRF directly without waiting
        if (this.isAuthEndpoint(request.url)) {
            return this.addCsrfAndSend(request, next);
        }

        // For other state-changing requests, wait for auth operations to complete
        // This prevents race conditions where requests use outdated CSRF tokens
        return this.authService.isAuthOperationInProgress$.pipe(
            filter(inProgress => !inProgress),
            take(1),
            switchMap(() => this.addCsrfAndSend(request, next))
        );
    }

    private addCsrfAndSend(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        return this.csrfService.getCsrfToken().pipe(
            switchMap(csrfToken => {
                const csrfRequest = request.clone({
                    setHeaders: {
                        'X-CSRF-Token': csrfToken,
                    },
                });
                return next
                    .handle(csrfRequest)
                    .pipe(
                        catchError(error =>
                            this.handleError(error, request, next)
                        )
                    );
            }),
            catchError(error => {
                this.logger.error('Failed to get CSRF token', error);
                return throwError(() => error);
            })
        );
    }

    private handleError(
        error: HttpErrorResponse,
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        // Handle 403 CSRF validation failed - retry with new token (once only)
        // Uses shared observable to coordinate concurrent refresh attempts
        if (
            error.status === 403 &&
            error.error?.errorCode === 'CSRF_VALIDATION_FAILED' &&
            this.isStateChangingMethod(request.method) &&
            !request.headers.has(CSRF_RETRY_HEADER) // Prevent infinite retry loops
        ) {
            // If no refresh is in progress, start one with shareReplay
            // so all concurrent failures share the same token refresh
            if (!this.refreshingToken$) {
                this.refreshingToken$ = this.csrfService
                    .refreshCsrfToken()
                    .pipe(
                        shareReplay(1),
                        finalize(() => {
                            this.refreshingToken$ = undefined;
                        })
                    );
            }

            return this.refreshingToken$.pipe(
                switchMap(newToken => {
                    const retryRequest = request.clone({
                        setHeaders: {
                            'X-CSRF-Token': newToken,
                            [CSRF_RETRY_HEADER]: 'true', // Mark as retried to prevent loops
                        },
                        withCredentials: true,
                    });
                    return next.handle(retryRequest);
                }),
                catchError(retryError => {
                    this.logger.error('CSRF retry request failed', {
                        originalError: error,
                        retryError,
                    });
                    return throwError(() => error); // keep returning original error
                })
            );
        }

        return throwError(() => error);
    }

    private addCredentials(
        request: HttpRequest<unknown>
    ): HttpRequest<unknown> {
        return request.clone({
            withCredentials: true,
        });
    }

    private isApiRequest(url: string): boolean {
        // Check for relative API paths (works in all environments)
        if (url.startsWith('/api/')) {
            return true;
        }
        // Check for absolute API URL (only if apiUrl is configured)
        if (this.apiUrl && url.startsWith(this.apiUrl)) {
            return true;
        }
        return false;
    }

    private isStateChangingMethod(method: string): boolean {
        return STATE_CHANGING_METHODS.includes(method.toUpperCase());
    }

    /**
     * Extract URL path without query string and fragment
     */
    private getUrlPath(url: string): string {
        try {
            // Handle both absolute and relative URLs
            const urlObj = new URL(url, 'http://dummy');
            return urlObj.pathname;
        } catch {
            // Fallback: remove query string and fragment manually
            return url.split('?')[0].split('#')[0];
        }
    }

    /**
     * Check if URL path matches endpoint exactly or ends with it
     * This prevents false positives like /api/auth/csrf-test matching /api/auth/csrf
     */
    private matchesEndpoint(url: string, endpoint: string): boolean {
        const path = this.getUrlPath(url);
        // Check exact match or if path ends with the endpoint
        return path === endpoint || path.endsWith(endpoint);
    }

    private isCsrfEndpoint(url: string): boolean {
        return CSRF_ENDPOINTS.some(endpoint =>
            this.matchesEndpoint(url, endpoint)
        );
    }

    private isAuthEndpoint(url: string): boolean {
        return AUTH_ENDPOINTS.some(endpoint =>
            this.matchesEndpoint(url, endpoint)
        );
    }
}

export const authInterceptorProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true,
};
