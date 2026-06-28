import { ReviewDto, ReviewSummaryDto } from '@drevo-web/shared';

/** Create a single review summary DTO (batch summary endpoint) */
export function createReviewSummaryDto(overrides: Partial<ReviewSummaryDto> = {}, index = 1): ReviewSummaryDto {
    return {
        versionId: index,
        status: 1,
        total: 1,
        needsMyVote: false,
        ...overrides,
    };
}

/** Create a single review DTO (list/set/delete endpoints) */
export function createReviewDto(overrides: Partial<ReviewDto> = {}): ReviewDto {
    return {
        reviewer: 'Reviewer User',
        status: 1,
        statusLabel: 'Одобряю',
        comment: '',
        updatedAt: '2025-01-15T10:00:00',
        ...overrides,
    };
}
