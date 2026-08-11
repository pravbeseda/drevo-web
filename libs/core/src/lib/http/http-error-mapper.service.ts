import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

/**
 * Extracted error info for consistent handling
 */
export interface MappedHttpError {
    /** User-friendly message to display */
    message: string;
    /** Original HTTP status code */
    status: number;
    /** Whether this is a network/connectivity error (status 0) */
    isNetworkError: boolean;
    /** Whether this is a server error (5xx) */
    isServerError: boolean;
    /** Whether this is a client error (4xx) */
    isClientError: boolean;
}

/**
 * Service for mapping HTTP errors to user-friendly messages.
 *
 * Can be extended/overridden for custom error messages or i18n.
 */
@Injectable({ providedIn: 'root' })
export class HttpErrorMapperService {
    /**
     * Maps an HttpErrorResponse to a user-friendly error structure.
     */
    mapError(err: HttpErrorResponse): MappedHttpError {
        const status = err.status;
        const message = this.getErrorMessage(err);

        return {
            message,
            status,
            isNetworkError: status === 0,
            isServerError: status >= 500,
            isClientError: status >= 400 && status < 500,
        };
    }

    /**
     * Gets a user-friendly error message for the given HTTP error.
     * Override this method to customize messages or add i18n support.
     */
    protected getErrorMessage(err: HttpErrorResponse): string {
        // Network error (no connection, CORS, etc.)
        if (err.status === 0) {
            return 'Сетевая ошибка. Проверьте подключение к интернету.';
        }

        // Authentication required
        if (err.status === 401) {
            return 'Требуется авторизация.';
        }

        // Forbidden
        if (err.status === 403) {
            return 'Доступ запрещен.';
        }

        // Not found
        if (err.status === 404) {
            return 'Не найдено.';
        }

        // Conflict (e.g., duplicate entry)
        if (err.status === 409) {
            return 'Объект уже существует или был модифицирован.';
        }

        // Validation error
        if (err.status === 422) {
            return this.extractValidationMessage(err) || 'Ошибка валидации.';
        }

        // Rate limiting
        if (err.status === 429) {
            return 'Слишком много запросов. Подождите и повторите запрос позже.';
        }

        // Server errors
        if (err.status >= 500) {
            return 'Ошибка на сервере. Попробуйте позже.';
        }

        // Try to extract backend message for other errors
        const backendMessage = this.extractBackendMessage(err);
        if (backendMessage) {
            return backendMessage;
        }

        return 'Неожиданная ошибка.';
    }

    /**
     * Attempts to extract a message from the backend response.
     * Override for custom API response structures.
     */
    protected extractBackendMessage(err: HttpErrorResponse): string | undefined {
        // `HttpErrorResponse.error` is `any` — whatever the response carried. Annotating it
        // `unknown` is what makes the narrowing below load-bearing rather than decorative.
        const error: unknown = err.error;

        // Handle common API response structures
        if (typeof error === 'object' && error) {
            // { message: "..." }
            if ('message' in error && typeof error.message === 'string' && error.message.length > 0) {
                return error.message;
            }
            // { error: "..." }
            if ('error' in error && typeof error.error === 'string' && error.error.length > 0) {
                return error.error;
            }
        }

        // Handle plain string error
        if (typeof error === 'string' && error.length > 0 && error.length < 200) {
            return error;
        }

        return undefined;
    }

    /**
     * Extracts validation error details for 422 responses.
     */
    protected extractValidationMessage(err: HttpErrorResponse): string | undefined {
        const errors = this.readErrorsBag(err.error);

        return this.firstListedMessage(errors) ?? this.firstFieldMessage(errors) ?? this.extractBackendMessage(err);
    }

    /** `{ errors: ... }` payload, in either the flat-list or per-field shape. */
    private readErrorsBag(error: unknown): unknown {
        if (typeof error === 'object' && error && 'errors' in error) {
            return (error as { errors: unknown }).errors;
        }
        return undefined;
    }

    /** `{ errors: ['message'] }` */
    private firstListedMessage(errors: unknown): string | undefined {
        if (Array.isArray(errors) && errors.length > 0 && typeof errors[0] === 'string') {
            return errors[0];
        }
        return undefined;
    }

    /** `{ errors: { field: ['message'] } }` */
    private firstFieldMessage(errors: unknown): string | undefined {
        if (typeof errors !== 'object' || !errors) {
            return undefined;
        }

        const firstField = Object.keys(errors)[0];
        if (!firstField) {
            return undefined;
        }

        const fieldErrors = (errors as Record<string, unknown>)[firstField];
        if (!Array.isArray(fieldErrors) || fieldErrors.length === 0) {
            return undefined;
        }

        const firstFieldError: unknown = fieldErrors[0];
        if (typeof firstFieldError !== 'string' || firstFieldError.length === 0) {
            return undefined;
        }

        return `${firstField}: ${firstFieldError}`;
    }
}
