import { ReviewSummaryDto } from '@drevo-web/shared';

/** Create a single review summary DTO (batch summary endpoint) */
export function createReviewSummaryDto(overrides: Partial<ReviewSummaryDto> = {}, index = 1): ReviewSummaryDto {
    return {
        versionId: index,
        status: 1,
        total: 1,
        needsMyVote: false,
        voters: { 1: ['Анна'] },
        myVote: null,
        ...overrides,
    };
}
