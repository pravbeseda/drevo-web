import { isOpenToModeration } from './moderation';
import { ApprovalStatus } from '@drevo-web/shared';

describe('isOpenToModeration', () => {
    it.each([ApprovalStatus.Pending, ApprovalStatus.Approved, ApprovalStatus.Rejected])(
        'should open a version with status %s to moderation',
        approved => {
            expect(isOpenToModeration(approved)).toBe(true);
        },
    );

    it('should keep a version cancelled by its author closed to moderation', () => {
        expect(isOpenToModeration(ApprovalStatus.Cancelled)).toBe(false);
    });
});
