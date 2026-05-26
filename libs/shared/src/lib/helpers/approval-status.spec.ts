import { ApprovalStatus } from '../models/article';
import { isApprovalStatus } from './approval-status';

describe('isApprovalStatus', () => {
    it('returns true for every declared status value', () => {
        for (const value of Object.values(ApprovalStatus)) {
            expect(isApprovalStatus(value)).toBe(true);
        }
    });

    it('returns false for numbers outside the declared set', () => {
        expect(isApprovalStatus(-3)).toBe(false);
        expect(isApprovalStatus(2)).toBe(false);
        expect(isApprovalStatus(42)).toBe(false);
        expect(isApprovalStatus(NaN)).toBe(false);
    });

    it('returns false for non-number values', () => {
        expect(isApprovalStatus('0')).toBe(false);
        expect(isApprovalStatus(undefined)).toBe(false);
        expect(isApprovalStatus(null)).toBe(false);
        expect(isApprovalStatus({})).toBe(false);
    });
});
