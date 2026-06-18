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
