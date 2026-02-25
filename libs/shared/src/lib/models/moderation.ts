import { ApprovalStatus } from './article';

export interface ModerationResult {
    readonly versionId: number;
    readonly articleId: number;
    readonly approved: ApprovalStatus;
    readonly comment: string;
}
