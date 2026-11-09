import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Logger, SKIP_ERROR_FOR_STATUSES } from '@drevo-web/core';
import { Observable, of } from 'rxjs';

const NOT_FOUND_STATUS = 404;

/** What a page resolver answers instead of the page, for the page to tell the two apart. */
export type ResolveFailure = 'not-found' | 'load-error';

/**
 * A `catchError` handler for a page resolver. A page that is gone is a stale
 * link, not a fault, so it is answered without a log entry. Anything else is
 * reported: recovering the stream here is what keeps it from reaching the
 * global error handler, and so from reaching Sentry.
 */
export function recoverResolveFailure(logger: Logger, message: string): (error: unknown) => Observable<ResolveFailure> {
    return error => {
        if (error instanceof HttpErrorResponse && error.status === NOT_FOUND_STATUS) {
            return of('not-found');
        }

        logger.error(message, error);
        return of('load-error');
    };
}

/** For a read whose 404 the resolver answers with a not-found page, which a toast would only repeat. */
export function skipNotFoundToast(): HttpContext {
    return new HttpContext().set(SKIP_ERROR_FOR_STATUSES, [NOT_FOUND_STATUS]);
}
