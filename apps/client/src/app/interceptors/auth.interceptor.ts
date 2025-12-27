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
import { LoggerService } from '../services/logger/logger.service';
import { environment } from '../../environments/environment';

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
const CSRF_ENDPOINTS = ['/api/auth/csrf'];
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/logout'];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private readonly apiUrl = environment.apiUrl;
    private readonly injector = inject(Injector);
    private readonly csrfService = inject(CsrfService);
    private readonly logger = inject(LoggerService);

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
                this.logger.error(
                    'Failed to get CSRF token',
                    'AuthInterceptor',
                    error
                );
                return throwError(() => error);
            })
        );
    }

    private handleError(
        error: HttpErrorResponse,
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        // Handle 403 CSRF validation failed - retry with new token
        // Uses shared observable to coordinate concurrent refresh attempts
        if (
            error.status === 403 &&
            error.error?.errorCode === 'CSRF_VALIDATION_FAILED' &&
            this.isStateChangingMethod(request.method)
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
                        },
                        withCredentials: true,
                    });
                    return next.handle(retryRequest);
                }),
                catchError(retryError => {
                    this.logger.error(
                        'CSRF retry request failed',
                        'AuthInterceptor',
                        {
                            originalError: error,
                            retryError,
                        }
                    );
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
        return url.startsWith(this.apiUrl) || url.startsWith('/api/');
    }

    private isStateChangingMethod(method: string): boolean {
        return STATE_CHANGING_METHODS.includes(method.toUpperCase());
    }

    private isCsrfEndpoint(url: string): boolean {
        return CSRF_ENDPOINTS.some(endpoint => url.includes(endpoint));
    }

    private isAuthEndpoint(url: string): boolean {
        return AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint));
    }
}

export const authInterceptorProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true,
};
