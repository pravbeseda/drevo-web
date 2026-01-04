import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

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
    protected extractBackendMessage(
        err: HttpErrorResponse
    ): string | undefined {
        const error = err.error;

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
        if (
            typeof error === 'string' &&
            error.length > 0 &&
            error.length < 200
        ) {
            return error;
        }

        return undefined;
    }

    /**
     * Extracts validation error details for 422 responses.
     */
    protected extractValidationMessage(
        err: HttpErrorResponse
    ): string | undefined {
        const error = err.error;

        if (typeof error === 'object' && error) {
            // { errors: { field: ["message"] } } or { errors: ["message"] }
            if ('errors' in error) {
                const errors = error.errors;
                if (Array.isArray(errors) && errors.length > 0) {
                    return String(errors[0]);
                }
                if (typeof errors === 'object' && errors) {
                    const firstField = Object.keys(errors)[0];
                    if (firstField) {
                        const fieldErrors = (errors as Record<string, unknown>)[
                            firstField
                        ];
                        if (
                            Array.isArray(fieldErrors) &&
                            fieldErrors.length > 0
                        ) {
                            return `${firstField}: ${fieldErrors[0]}`;
                        }
                    }
                }
            }
        }

        return this.extractBackendMessage(err);
    }
}
