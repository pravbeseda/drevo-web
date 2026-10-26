import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Observable, catchError, retry, shareReplay, throwError, timer } from 'rxjs';

// OpenRouter does not expose `Retry-After` to the page, so a rate-limited request waits a fixed time.
export const AI_RETRY_DELAY_MS = 2000;

export function hasStatus(err: unknown, status: number): boolean {
    return err instanceof HttpErrorResponse && err.status === status;
}

// What tells a wrong request from an outage; an HttpErrorResponse carries no request headers, so no key.
export function describeError(err: unknown): unknown {
    if (err instanceof HttpErrorResponse) {
        const body: unknown = err.error;
        return { status: err.status, message: err.message, body };
    }
    return err instanceof Error ? { message: err.message } : err;
}

/**
 * The request `cache` holds under `key`, made only on a miss: retried once after a 429, shared while in flight
 * and replayed after, dropped from the cache on an error so the next call asks again.
 */
export function cachedRequest<T>(
    cache: Map<string, Observable<T>>,
    key: string,
    request: () => Observable<T>,
): Observable<T> {
    const cached = cache.get(key);
    if (cached) return cached;

    const shared = request().pipe(
        retry({
            count: 1,
            delay: (err: unknown) =>
                hasStatus(err, HttpStatusCode.TooManyRequests) ? timer(AI_RETRY_DELAY_MS) : throwError(() => err),
        }),
        catchError((err: unknown) => {
            cache.delete(key);
            return throwError(() => err);
        }),
        shareReplay(1),
    );
    cache.set(key, shared);
    return shared;
}
