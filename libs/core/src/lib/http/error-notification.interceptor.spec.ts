/* eslint-disable no-null/no-null */
import { HttpContext } from '@angular/common/http';
import { ErrorNotificationInterceptor } from './error-notification.interceptor';
import { NotificationService } from '../services/notification.service';
import { HttpErrorMapperService } from './http-error-mapper.service';
import {
    SKIP_ERROR_NOTIFICATION,
    CUSTOM_ERROR_MESSAGE,
    SKIP_ERROR_FOR_STATUSES,
} from './http-context-tokens';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import {
    provideHttpClientTesting,
    HttpTestingController,
} from '@angular/common/http/testing';

describe('ErrorNotificationInterceptor', () => {
    let httpClient: HttpClient;
    let httpTestingController: HttpTestingController;
    let notificationService: jest.Mocked<NotificationService>;

    // Helper to subscribe with expected error
    const subscribeWithExpectedError = (
        obs: ReturnType<typeof httpClient.get>
    ): void => {
        obs.subscribe({
            error: (_err: unknown) => {
                // Error is expected in these tests
            },
        });
    };

    beforeEach(() => {
        notificationService = {
            error: jest.fn(),
            success: jest.fn(),
            info: jest.fn(),
        } as unknown as jest.Mocked<NotificationService>;

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: ErrorNotificationInterceptor,
                    multi: true,
                },
                { provide: NotificationService, useValue: notificationService },
                HttpErrorMapperService,
            ],
        });

        httpClient = TestBed.inject(HttpClient);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    describe('automatic error notifications', () => {
        it('should show error notification for 500 error', () => {
            subscribeWithExpectedError(httpClient.get('/api/test'));

            const req = httpTestingController.expectOne('/api/test');
            req.flush(null, { status: 500, statusText: 'Server Error' });

            expect(notificationService.error).toHaveBeenCalledWith(
                'Ошибка на сервере. Попробуйте позже.'
            );
        });

        it('should show error notification for 404 error', () => {
            subscribeWithExpectedError(httpClient.get('/api/test'));

            const req = httpTestingController.expectOne('/api/test');
            req.flush(null, { status: 404, statusText: 'Not Found' });

            expect(notificationService.error).toHaveBeenCalledWith(
                'Не найдено.'
            );
        });

        it('should show error notification for network error', () => {
            subscribeWithExpectedError(httpClient.get('/api/test'));

            const req = httpTestingController.expectOne('/api/test');
            req.error(new ProgressEvent('error'));

            expect(notificationService.error).toHaveBeenCalledWith(
                'Сетевая ошибка. Проверьте подключение к интернету.'
            );
        });
    });

    describe('SKIP_ERROR_NOTIFICATION context token', () => {
        it('should NOT show notification when SKIP_ERROR_NOTIFICATION is true', () => {
            const context = new HttpContext().set(
                SKIP_ERROR_NOTIFICATION,
                true
            );

            subscribeWithExpectedError(
                httpClient.get('/api/test', { context })
            );

            const req = httpTestingController.expectOne('/api/test');
            req.flush(null, { status: 500, statusText: 'Server Error' });

            expect(notificationService.error).not.toHaveBeenCalled();
        });

        it('should show notification when SKIP_ERROR_NOTIFICATION is false', () => {
            const context = new HttpContext().set(
                SKIP_ERROR_NOTIFICATION,
                false
            );

            subscribeWithExpectedError(
                httpClient.get('/api/test', { context })
            );

            const req = httpTestingController.expectOne('/api/test');
            req.flush(null, { status: 500, statusText: 'Server Error' });

            expect(notificationService.error).toHaveBeenCalled();
        });
    });

    describe('SKIP_ERROR_FOR_STATUSES context token', () => {
        it('should NOT show notification for skipped status codes', () => {
            const context = new HttpContext().set(
                SKIP_ERROR_FOR_STATUSES,
                [404, 409]
            );

            subscribeWithExpectedError(
                httpClient.get('/api/test', { context })
            );

            const req = httpTestingController.expectOne('/api/test');
            req.flush(null, { status: 404, statusText: 'Not Found' });

            expect(notificationService.error).not.toHaveBeenCalled();
        });

        it('should show notification for non-skipped status codes', () => {
            const context = new HttpContext().set(SKIP_ERROR_FOR_STATUSES, [
                404,
            ]);

            subscribeWithExpectedError(
                httpClient.get('/api/test', { context })
            );

            const req = httpTestingController.expectOne('/api/test');
            req.flush(null, { status: 500, statusText: 'Server Error' });

            expect(notificationService.error).toHaveBeenCalled();
        });
    });

    describe('CUSTOM_ERROR_MESSAGE context token', () => {
        it('should show custom error message when provided', () => {
            const customMessage = 'Failed to save your changes';
            const context = new HttpContext().set(
                CUSTOM_ERROR_MESSAGE,
                customMessage
            );

            subscribeWithExpectedError(
                httpClient.post('/api/test', {}, { context })
            );

            const req = httpTestingController.expectOne('/api/test');
            req.flush(null, { status: 500, statusText: 'Server Error' });

            expect(notificationService.error).toHaveBeenCalledWith(
                customMessage
            );
        });

        it('should use default message when custom message is empty', () => {
            const context = new HttpContext().set(CUSTOM_ERROR_MESSAGE, '');

            subscribeWithExpectedError(
                httpClient.get('/api/test', { context })
            );

            const req = httpTestingController.expectOne('/api/test');
            req.flush(null, { status: 404, statusText: 'Not Found' });

            expect(notificationService.error).toHaveBeenCalledWith(
                'Не найдено.'
            );
        });
    });

    describe('successful requests', () => {
        it('should NOT show notification for successful requests', () => {
            httpClient.get('/api/test').subscribe();

            const req = httpTestingController.expectOne('/api/test');
            req.flush({ data: 'success' });

            expect(notificationService.error).not.toHaveBeenCalled();
        });
    });
});
