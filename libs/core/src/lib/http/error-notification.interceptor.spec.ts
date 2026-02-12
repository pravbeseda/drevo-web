import {
    HttpContext,
    HTTP_INTERCEPTORS,
    HttpClient,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
    createHttpFactory,
    HttpMethod,
    SpectatorHttp,
} from '@ngneat/spectator/jest';
import { NotificationService } from '../services/notification.service';
import { ErrorNotificationInterceptor } from './error-notification.interceptor';
import {
    SKIP_ERROR_NOTIFICATION,
    CUSTOM_ERROR_MESSAGE,
    SKIP_ERROR_FOR_STATUSES,
} from './http-context-tokens';
import { HttpErrorMapperService } from './http-error-mapper.service';

/**
 * Dummy service to make HTTP requests through the interceptor.
 * SpectatorHttp requires a service, so we use HttpClient directly.
 */
@Injectable()
class TestHttpService {
    private readonly http = inject(HttpClient);

    get(url: string, context?: HttpContext) {
        return this.http.get(url, { context });
    }

    post(url: string, body: unknown, context?: HttpContext) {
        return this.http.post(url, body, { context });
    }
}

describe('ErrorNotificationInterceptor', () => {
    let spectator: SpectatorHttp<TestHttpService>;
    let notificationService: jest.Mocked<NotificationService>;

    const createHttp = createHttpFactory({
        service: TestHttpService,
        providers: [
            {
                provide: HTTP_INTERCEPTORS,
                useClass: ErrorNotificationInterceptor,
                multi: true,
            },
            HttpErrorMapperService,
        ],
        mocks: [NotificationService],
    });

    beforeEach(() => {
        spectator = createHttp();
        notificationService = spectator.inject(
            NotificationService
        ) as jest.Mocked<NotificationService>;
    });

    describe('automatic error notifications', () => {
        it('should show error notification for 500 error', () => {
            spectator.service.get('/api/test').subscribe({ error: () => {} });

            spectator.expectOne('/api/test', HttpMethod.GET).flush(null, {
                status: 500,
                statusText: 'Server Error',
            });

            expect(notificationService.error).toHaveBeenCalledWith(
                'Ошибка на сервере. Попробуйте позже.'
            );
        });

        it('should show error notification for 404 error', () => {
            spectator.service.get('/api/test').subscribe({ error: () => {} });

            spectator.expectOne('/api/test', HttpMethod.GET).flush(null, {
                status: 404,
                statusText: 'Not Found',
            });

            expect(notificationService.error).toHaveBeenCalledWith(
                'Не найдено.'
            );
        });

        it('should show error notification for network error', () => {
            spectator.service.get('/api/test').subscribe({ error: () => {} });

            spectator
                .expectOne('/api/test', HttpMethod.GET)
                .error(new ProgressEvent('error'));

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

            spectator.service
                .get('/api/test', context)
                .subscribe({ error: () => {} });

            spectator.expectOne('/api/test', HttpMethod.GET).flush(null, {
                status: 500,
                statusText: 'Server Error',
            });

            expect(notificationService.error).not.toHaveBeenCalled();
        });

        it('should show notification when SKIP_ERROR_NOTIFICATION is false', () => {
            const context = new HttpContext().set(
                SKIP_ERROR_NOTIFICATION,
                false
            );

            spectator.service
                .get('/api/test', context)
                .subscribe({ error: () => {} });

            spectator.expectOne('/api/test', HttpMethod.GET).flush(null, {
                status: 500,
                statusText: 'Server Error',
            });

            expect(notificationService.error).toHaveBeenCalled();
        });
    });

    describe('SKIP_ERROR_FOR_STATUSES context token', () => {
        it('should NOT show notification for skipped status codes', () => {
            const context = new HttpContext().set(
                SKIP_ERROR_FOR_STATUSES,
                [404, 409]
            );

            spectator.service
                .get('/api/test', context)
                .subscribe({ error: () => {} });

            spectator.expectOne('/api/test', HttpMethod.GET).flush(null, {
                status: 404,
                statusText: 'Not Found',
            });

            expect(notificationService.error).not.toHaveBeenCalled();
        });

        it('should show notification for non-skipped status codes', () => {
            const context = new HttpContext().set(
                SKIP_ERROR_FOR_STATUSES,
                [404]
            );

            spectator.service
                .get('/api/test', context)
                .subscribe({ error: () => {} });

            spectator.expectOne('/api/test', HttpMethod.GET).flush(null, {
                status: 500,
                statusText: 'Server Error',
            });

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

            spectator.service
                .post('/api/test', {}, context)
                .subscribe({ error: () => {} });

            spectator.expectOne('/api/test', HttpMethod.POST).flush(null, {
                status: 500,
                statusText: 'Server Error',
            });

            expect(notificationService.error).toHaveBeenCalledWith(
                customMessage
            );
        });

        it('should use default message when custom message is empty', () => {
            const context = new HttpContext().set(CUSTOM_ERROR_MESSAGE, '');

            spectator.service
                .get('/api/test', context)
                .subscribe({ error: () => {} });

            spectator.expectOne('/api/test', HttpMethod.GET).flush(null, {
                status: 404,
                statusText: 'Not Found',
            });

            expect(notificationService.error).toHaveBeenCalledWith(
                'Не найдено.'
            );
        });
    });

    describe('successful requests', () => {
        it('should NOT show notification for successful requests', () => {
            spectator.service.get('/api/test').subscribe();

            spectator
                .expectOne('/api/test', HttpMethod.GET)
                .flush({ data: 'success' });

            expect(notificationService.error).not.toHaveBeenCalled();
        });
    });
});
