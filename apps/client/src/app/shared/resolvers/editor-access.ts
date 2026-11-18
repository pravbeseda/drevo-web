import { ArticleService } from '../../services/articles';
import { Logger, NotificationService } from '@drevo-web/core';
import { PageKind } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const CHECK_FAILED_REASON = 'Не удалось проверить права на редактирование';

/** Why the editor does not open; `error` is set when the check itself failed. */
export interface EditorRefusal {
    readonly reason: string;
    readonly error?: unknown;
}

/**
 * Asks the server whether the editor may open — on a version, or on a new page
 * of the kind — and answers the refusal, or `undefined` when it may. A check
 * that fails refuses too: an unreachable endpoint must not lift the limit.
 */
export function editorRefusal(
    articleService: ArticleService,
    kind: PageKind,
    versionId?: number,
): Observable<EditorRefusal | undefined> {
    return articleService.checkEdit(kind, versionId).pipe(
        map(check => (check.allowed ? undefined : { reason: check.reason })),
        catchError((error: unknown) => of({ reason: CHECK_FAILED_REASON, error })),
    );
}

/** Tells the user why the editor did not open, and records it. */
export function reportEditorRefusal(
    notificationService: NotificationService,
    logger: Logger,
    refusal: EditorRefusal,
    context: Readonly<Record<string, unknown>>,
): void {
    notificationService.error(refusal.reason);
    if ('error' in refusal) {
        logger.error('Editor access check failed', refusal.error);
    } else {
        logger.warn('Editor refused', { ...context, reason: refusal.reason });
    }
}
