import { SKIP_ERROR_NOTIFICATION, CUSTOM_ERROR_MESSAGE, SKIP_ERROR_FOR_STATUSES } from './http-context-tokens';
import { HttpErrorMapperService } from './http-error-mapper.service';
import { NotificationService } from '../services/notification.service';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpErrorResponse,
    HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * HTTP interceptor that automatically shows toast notifications for HTTP errors.
 *
 * Behavior can be controlled per-request using HTTP context tokens:
 *
 * @example
 * // Skip error notification entirely
 * this.http.get('/api/data', {
 *   context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true)
 * });
 *
 * @example
 * // Skip only for specific status codes
 * this.http.get('/api/data', {
 *   context: new HttpContext().set(SKIP_ERROR_FOR_STATUSES, [404])
 * });
 *
 * @example
 * // Custom error message
 * this.http.post('/api/action', body, {
 *   context: new HttpContext().set(CUSTOM_ERROR_MESSAGE, 'Failed to save')
 * });
 */
@Injectable()
export class ErrorNotificationInterceptor implements HttpInterceptor {
    private readonly notification = inject(NotificationService);
    private readonly errorMapper = inject(HttpErrorMapperService);

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError((error: unknown) => {
                if (error instanceof HttpErrorResponse) {
                    this.handleError(request, error);
                } else {
                    this.notification.error('Произошла неожиданная ошибка.');
                }
                return throwError(() => error);
            })
        );
    }

    private handleError(request: HttpRequest<unknown>, error: HttpErrorResponse): void {
        // Check if notifications are completely skipped for this request
        if (request.context.get(SKIP_ERROR_NOTIFICATION)) {
            return;
        }

        // Check if this specific status code should be skipped
        const skipStatuses = request.context.get(SKIP_ERROR_FOR_STATUSES);
        if (skipStatuses.length > 0 && skipStatuses.includes(error.status)) {
            return;
        }

        // Determine the message to show
        const customMessage = request.context.get(CUSTOM_ERROR_MESSAGE);
        const message = customMessage || this.errorMapper.mapError(error).message;

        this.notification.error(message);
    }
}

/**
 * Provider for ErrorNotificationInterceptor.
 * Add this to your app providers to enable automatic error notifications.
 *
 * @example
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(withInterceptorsFromDi()),
 *     errorNotificationInterceptorProvider,
 *   ],
 * };
 */
export const errorNotificationInterceptorProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: ErrorNotificationInterceptor,
    multi: true,
};
