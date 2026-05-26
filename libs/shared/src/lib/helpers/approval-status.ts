import { ApprovalStatus } from '../models/article';

const APPROVAL_STATUS_VALUES = new Set<number>(Object.values(ApprovalStatus));

export function isApprovalStatus(value: unknown): value is ApprovalStatus {
    return typeof value === 'number' && APPROVAL_STATUS_VALUES.has(value);
}
