import { HttpErrorResponse } from '@angular/common/http';
import { ApprovalStatus } from '@drevo-web/shared';
import { isCancelVersionConflict } from './cancel-version.errors';

describe('isCancelVersionConflict', () => {
    it('returns true for HttpErrorResponse 409 with INVALID_STATE payload', () => {
        const err = new HttpErrorResponse({
            status: 409,
            error: {
                errorCode: 'INVALID_STATE',
                data: { versionId: 1, articleId: 2, approved: ApprovalStatus.Approved },
            },
        });
        expect(isCancelVersionConflict(err)).toBe(true);
    });

    it('returns false when status is not 409', () => {
        const err = new HttpErrorResponse({
            status: 400,
            error: {
                errorCode: 'INVALID_STATE',
                data: { versionId: 1, articleId: 2, approved: 1 },
            },
        });
        expect(isCancelVersionConflict(err)).toBe(false);
    });

    it('returns false when errorCode is not INVALID_STATE', () => {
        const err = new HttpErrorResponse({
            status: 409,
            error: { errorCode: 'OTHER', data: { versionId: 1, articleId: 2, approved: 1 } },
        });
        expect(isCancelVersionConflict(err)).toBe(false);
    });

    it('returns false when payload.approved is not a number', () => {
        const err = new HttpErrorResponse({
            status: 409,
            error: { errorCode: 'INVALID_STATE', data: { versionId: 1, articleId: 2 } },
        });
        expect(isCancelVersionConflict(err)).toBe(false);
    });

    it('returns false for non-HttpErrorResponse values', () => {
        expect(isCancelVersionConflict(new Error('boom'))).toBe(false);
        expect(isCancelVersionConflict(undefined)).toBe(false);
        expect(isCancelVersionConflict({ status: 409 })).toBe(false);
    });
});
