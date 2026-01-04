import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { HttpErrorResponse } from '@angular/common/http';
import {
    HttpErrorMapperService,
    MappedHttpError,
} from './http-error-mapper.service';

describe('HttpErrorMapperService', () => {
    let spectator: SpectatorService<HttpErrorMapperService>;
    const createService = createServiceFactory({
        service: HttpErrorMapperService,
    });

    beforeEach(() => {
        spectator = createService();
    });

    const createHttpError = (
        status: number,
        error: unknown = undefined,
        statusText = 'Error'
    ): HttpErrorResponse => {
        return new HttpErrorResponse({
            status,
            statusText,
            error,
            url: '/api/test',
        });
    };

    describe('mapError', () => {
        it('should map network error (status 0)', () => {
            const error = createHttpError(0);
            const result = spectator.service.mapError(error);

            expect(result).toEqual<MappedHttpError>({
                message: 'Сетевая ошибка. Проверьте подключение к интернету.',
                status: 0,
                isNetworkError: true,
                isServerError: false,
                isClientError: false,
            });
        });

        it('should map 401 authentication error', () => {
            const error = createHttpError(401);
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Требуется авторизация.');
            expect(result.status).toBe(401);
            expect(result.isClientError).toBe(true);
        });

        it('should map 403 forbidden error', () => {
            const error = createHttpError(403);
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Доступ запрещен.');
            expect(result.status).toBe(403);
        });

        it('should map 404 not found error', () => {
            const error = createHttpError(404);
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Не найдено.');
            expect(result.status).toBe(404);
        });

        it('should map 409 conflict error', () => {
            const error = createHttpError(409);
            const result = spectator.service.mapError(error);

            expect(result.message).toBe(
                'Объект уже существует или был модифицирован.'
            );
        });

        it('should map 422 validation error with generic message', () => {
            const error = createHttpError(422);
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Ошибка валидации.');
        });

        it('should extract validation errors array', () => {
            const error = createHttpError(422, {
                errors: ['Email is required'],
            });
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Email is required');
        });

        it('should extract validation errors object', () => {
            const error = createHttpError(422, {
                errors: { email: ['Invalid email format'] },
            });
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('email: Invalid email format');
        });

        it('should map 429 rate limit error', () => {
            const error = createHttpError(429);
            const result = spectator.service.mapError(error);

            expect(result.message).toBe(
                'Слишком много запросов. Подождите и повторите запрос позже.'
            );
        });

        it('should map 500 server error', () => {
            const error = createHttpError(500);
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Ошибка на сервере. Попробуйте позже.');
            expect(result.isServerError).toBe(true);
        });

        it('should map 502 server error', () => {
            const error = createHttpError(502);
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Ошибка на сервере. Попробуйте позже.');
            expect(result.isServerError).toBe(true);
        });

        it('should map 503 server error', () => {
            const error = createHttpError(503);
            const result = spectator.service.mapError(error);

            expect(result.isServerError).toBe(true);
        });

        it('should extract backend message from error.message', () => {
            const error = createHttpError(400, {
                message: 'Custom backend message',
            });
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Custom backend message');
        });

        it('should extract backend message from error.error', () => {
            const error = createHttpError(400, {
                error: 'Custom error string',
            });
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Custom error string');
        });

        it('should handle plain string error', () => {
            const error = createHttpError(400, 'Plain string error');
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Plain string error');
        });

        it('should fallback to generic message for unknown errors', () => {
            const error = createHttpError(418); // I'm a teapot
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Неожиданная ошибка.');
        });

        it('should ignore very long string errors', () => {
            const longString = 'x'.repeat(300);
            const error = createHttpError(400, longString);
            const result = spectator.service.mapError(error);

            expect(result.message).toBe('Неожиданная ошибка.');
        });

        it('should correctly identify client errors', () => {
            const error = createHttpError(400);
            const result = spectator.service.mapError(error);

            expect(result.isClientError).toBe(true);
            expect(result.isServerError).toBe(false);
            expect(result.isNetworkError).toBe(false);
        });
    });
});
