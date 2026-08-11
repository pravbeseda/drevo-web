import { HttpErrorResponse } from '@angular/common/http';

/**
 * The parts of a failed API response body the client reads.
 *
 * @public — the return type of `readApiErrorBody`, named by every consumer that keeps the body around
 */
export interface ApiErrorBody {
    /** Human-readable message from the backend. */
    readonly error?: string;
    /** Machine-readable code the UI branches on, e.g. `TITLE_ALREADY_EXISTS`. */
    readonly errorCode?: string;
    /** Message field of the alternative backend shape. */
    readonly message?: string;
}

/**
 * Narrows `HttpErrorResponse.error`, typed `any` by Angular because it holds whatever the
 * response carried — parsed JSON, a string, or a `ProgressEvent` for a transport failure.
 *
 * Returns `undefined` when the body is not an object at all; a field the body does not carry
 * as a string comes back as `undefined` rather than as the raw value.
 */
export function readApiErrorBody(response: HttpErrorResponse): ApiErrorBody | undefined {
    const body: unknown = response.error;

    if (typeof body !== 'object' || !body) {
        return undefined;
    }

    return {
        error: readStringField(body, 'error'),
        errorCode: readStringField(body, 'errorCode'),
        message: readStringField(body, 'message'),
    };
}

function readStringField(body: object, field: keyof ApiErrorBody): string | undefined {
    const value = (body as Record<string, unknown>)[field];

    return typeof value === 'string' ? value : undefined;
}
