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
    readonly topics: readonly number[];
}

/**
 * Article approval status: -2 (cancelled by author), -1 (rejected), 0 (pending), 1 (approved)
 */
export const ApprovalStatus = {
    Cancelled: -2,
    Rejected: -1,
    Pending: 0,
    Approved: 1,
} as const satisfies Record<string, ApprovalStatusDto>;

export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export type ApprovalClass = 'cancelled' | 'rejected' | 'pending' | 'approved';

export const APPROVAL_CLASS: Record<ApprovalStatus, ApprovalClass> = {
    [ApprovalStatus.Cancelled]: 'cancelled',
    [ApprovalStatus.Rejected]: 'rejected',
    [ApprovalStatus.Pending]: 'pending',
    [ApprovalStatus.Approved]: 'approved',
};

export const APPROVAL_ICONS: Record<ApprovalClass, string> = {
    cancelled: 'block',
    rejected: 'cancel',
    pending: 'schedule',
    approved: 'check_circle',
};

export const APPROVAL_TITLES: Record<ApprovalClass, string> = {
    cancelled: 'Отменена автором',
    rejected: 'Отклонено',
    pending: 'На проверке',
    approved: 'Одобрено',
};

export interface RenameArticleResponse {
    readonly articleId: number;
    readonly title: string;
}

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
