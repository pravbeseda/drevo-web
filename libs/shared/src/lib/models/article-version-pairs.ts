import { ApprovalStatus } from './article';

/**
 * Single version data for diff comparison (frontend model)
 */
export interface VersionForDiff {
    readonly articleId: number;
    readonly versionId: number;
    readonly content: string;
    readonly author: string;
    readonly date: Date;
    readonly title: string;
    readonly info: string;
    readonly approved: ApprovalStatus;
}

/**
 * Pair of versions for diff comparison (frontend model)
 */
export interface VersionPairs {
    readonly current: VersionForDiff;
    readonly previous: VersionForDiff;
}
