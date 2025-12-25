import { Injectable, inject } from '@angular/core';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpErrorResponse,
    HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { CsrfService } from '../services/auth/csrf.service';
import { LoggerService } from '../services/logger/logger.service';
import { environment } from '../../environments/environment';

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
const CSRF_ENDPOINTS = ['/api/auth/csrf'];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private readonly apiUrl = environment.apiUrl;
    private readonly csrfService = inject(CsrfService);
    private readonly logger = inject(LoggerService);
    private retryingRequest = false;

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

        // For state-changing requests, add CSRF token
        return this.addCsrfAndSend(request, next);
    }

    private addCsrfAndSend(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        return this.csrfService.csrfToken$.pipe(
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
        // Handle 403 CSRF validation failed - retry once with new token
        if (
            error.status === 403 &&
            error.error?.errorCode === 'CSRF_VALIDATION_FAILED' &&
            !this.retryingRequest &&
            this.isStateChangingMethod(request.method)
        ) {
            this.retryingRequest = true;
            return this.csrfService.refreshCsrfToken().pipe(
                switchMap(newToken => {
                    const retryRequest = request.clone({
                        setHeaders: {
                            'X-CSRF-Token': newToken,
                        },
                        withCredentials: true,
                    });
                    return next.handle(retryRequest);
                }),
                catchError(() => throwError(() => error)), // original error if retry fails
                finalize(() => {
                    this.retryingRequest = false;
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
}

export const authInterceptorProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true,
};
