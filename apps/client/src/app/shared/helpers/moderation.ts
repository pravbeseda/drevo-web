import { ApprovalStatus } from '@drevo-web/shared';

/** A version its author cancelled is withdrawn, so a moderator has nothing to decide on it. */
export function isOpenToModeration(approved: ApprovalStatus): boolean {
    return approved !== ApprovalStatus.Cancelled;
}
