import { ApprovalStatus } from './article';

export interface CancelVersionResult {
    readonly versionId: number;
    readonly articleId: number;
    readonly approved: ApprovalStatus;
}
