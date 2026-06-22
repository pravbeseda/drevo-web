/**
 * People's review (premoderation) domain models.
 *
 * Status values mirror the legacy backend exactly:
 * 0 — undecided, 1 — approve, 2 — suggest edits, 3 — disagree.
 */
export const ReviewStatus = {
    Undecided: 0,
    Approve: 1,
    Suggest: 2,
    Disagree: 3,
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

/**
 * Review target type — selects the backend model (articles vs news).
 */
export type ReviewTarget = 'article' | 'news';

/**
 * Presentation class for a review status (drives --themed-* color). Distinct
 * from ApprovalStatus styling — the review scale has 4 values, including a
 * neutral "undecided".
 */
export type ReviewStatusClass = 'success' | 'warning' | 'error' | 'neutral';

/**
 * Status → first-person vote label (mirrors legacy ReviewService::STATUS_LABELS).
 * Used by the vote form pills, comment list and the header tally.
 */
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
    [ReviewStatus.Undecided]: 'Нет решения',
    [ReviewStatus.Approve]: 'Одобряю',
    [ReviewStatus.Suggest]: 'Нужны правки',
    [ReviewStatus.Disagree]: 'Возражаю',
};

/**
 * Status → Material icon name. Picked for the vote semantics — deliberately NOT
 * reusing APPROVAL_ICONS (the approval scale is a different domain).
 */
export const REVIEW_STATUS_ICONS: Record<ReviewStatus, string> = {
    [ReviewStatus.Undecided]: 'help',
    [ReviewStatus.Approve]: 'check',
    [ReviewStatus.Suggest]: 'edit',
    [ReviewStatus.Disagree]: 'close',
};

/**
 * Status → presentation class (maps to --themed-* color in the component SCSS).
 */
export const REVIEW_STATUS_CLASS: Record<ReviewStatus, ReviewStatusClass> = {
    [ReviewStatus.Undecided]: 'neutral',
    [ReviewStatus.Approve]: 'success',
    [ReviewStatus.Suggest]: 'warning',
    [ReviewStatus.Disagree]: 'error',
};

/**
 * Statuses that require a non-empty comment (mirrors legacy
 * ReviewService::COMMENT_REQUIRED_STATUSES).
 */
export const REVIEW_COMMENT_REQUIRED_STATUSES: readonly ReviewStatus[] = [ReviewStatus.Suggest, ReviewStatus.Disagree];

/**
 * Verdict statuses shown in the block header tally, in display order
 * (Undecided is intentionally excluded — it is not a verdict).
 */
export const REVIEW_TALLY_STATUSES: readonly ReviewStatus[] = [
    ReviewStatus.Approve,
    ReviewStatus.Suggest,
    ReviewStatus.Disagree,
];

/**
 * A single reviewer's vote on a version.
 */
export interface Review {
    readonly reviewer: string;
    readonly status: ReviewStatus;
    readonly comment: string;
    readonly updatedAt: Date;
}

/**
 * Aggregated review summary for one version, used by the history badge.
 *
 * - `status` — verdict to display (priority disagree > suggest > approve), or
 *   undefined when there is no significant verdict to show.
 * - `total` — total number of significant votes (status > 0) on the version,
 *   independent of `status`.
 * - `needsMyVote` — the version is awaiting the current user's vote.
 */
export interface ReviewSummary {
    readonly versionId: number;
    readonly status?: ReviewStatus;
    readonly total: number;
    readonly needsMyVote: boolean;
}
