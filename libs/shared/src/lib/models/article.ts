import { ApprovalStatusDto } from './dto/article.dto';

export interface Article {
    readonly articleId: number;
    readonly title: string;
}

export interface ArticleVersion extends Article {
    readonly versionId: number;
    readonly content: string;
    readonly author: string;
    readonly date: Date;
    readonly redirect: boolean;
    readonly new: boolean;
    readonly approved: ApprovalStatus;
    readonly info: string;
    readonly comment: string;
}

/**
 * Article approval status: -1 (rejected), 0 (pending), 1 (approved)
 */
export const ApprovalStatus = {
    Rejected: -1,
    Pending: 0,
    Approved: 1,
} as const satisfies Record<string, ApprovalStatusDto>;

export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export type ApprovalClass = 'approved' | 'rejected' | 'pending';

export const APPROVAL_CLASS: Record<ApprovalStatus, ApprovalClass> = {
    [ApprovalStatus.Approved]: 'approved',
    [ApprovalStatus.Pending]: 'pending',
    [ApprovalStatus.Rejected]: 'rejected',
};

export const APPROVAL_ICONS: Record<ApprovalClass, string> = {
    approved: 'check_circle',
    pending: 'schedule',
    rejected: 'cancel',
};

export const APPROVAL_TITLES: Record<ApprovalClass, string> = {
    approved: 'Одобрено',
    pending: 'На проверке',
    rejected: 'Отклонено',
};

/**
 * Request for saving article version
 */
export interface SaveArticleVersionRequest {
    readonly versionId: number;
    readonly content: string;
    readonly info?: string;
}

/**
 * Result of saving article version
 */
export interface SaveArticleVersionResult {
    readonly articleId: number;
    readonly versionId: number;
    readonly title: string;
    readonly author: string;
    readonly date: Date;
    readonly approved: ApprovalStatus;
}
