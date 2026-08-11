import { HttpErrorResponse } from '@angular/common/http';
import { readApiErrorBody } from './api-error-body';

describe('readApiErrorBody', () => {
    const responseWith = (error: unknown): HttpErrorResponse => new HttpErrorResponse({ error, status: 400 });

    it('should read the API error fields', () => {
        const body = readApiErrorBody(
            responseWith({ success: false, error: 'Заголовок занят', errorCode: 'TITLE_ALREADY_EXISTS' }),
        );

        expect(body).toEqual({
            error: 'Заголовок занят',
            errorCode: 'TITLE_ALREADY_EXISTS',
            message: undefined,
        });
    });

    it('should read the message field', () => {
        expect(readApiErrorBody(responseWith({ message: 'Ошибка валидации' }))?.message).toBe('Ошибка валидации');
    });

    it('should drop fields that are not strings', () => {
        const body = readApiErrorBody(responseWith({ error: { nested: true }, errorCode: 42 }));

        expect(body).toEqual({ error: undefined, errorCode: undefined, message: undefined });
    });

    it('should return undefined for a body that is not an object', () => {
        expect(readApiErrorBody(responseWith('Internal Server Error'))).toBeUndefined();
        expect(readApiErrorBody(responseWith(undefined))).toBeUndefined();
    });

    it('should return undefined for a network failure carrying a ProgressEvent', () => {
        const response = new HttpErrorResponse({ error: new ProgressEvent('error'), status: 0 });

        expect(readApiErrorBody(response)).toEqual({
            error: undefined,
            errorCode: undefined,
            message: undefined,
        });
    });
});
