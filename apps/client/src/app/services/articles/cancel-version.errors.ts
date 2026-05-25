import { HttpErrorResponse } from '@angular/common/http';
import { ApprovalStatus } from '@drevo-web/shared';

export interface CancelVersionConflictPayload {
    readonly versionId: number;
    readonly articleId: number;
    readonly approved: ApprovalStatus;
}

export function isCancelVersionConflict(err: unknown): err is HttpErrorResponse & {
    error: { errorCode: 'INVALID_STATE'; data: CancelVersionConflictPayload };
} {
    if (!(err instanceof HttpErrorResponse) || err.status !== 409) {
        return false;
    }
    const body = err.error as { errorCode?: string; data?: { approved?: unknown } } | null;
    return body?.errorCode === 'INVALID_STATE' && typeof body?.data?.approved === 'number';
}
