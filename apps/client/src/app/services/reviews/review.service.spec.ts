import { ReviewApiService } from './review-api.service';
import { ReviewService } from './review.service';
import { ReviewDto, ReviewStatus, ReviewSummaryDto } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('ReviewService', () => {
    let spectator: SpectatorService<ReviewService>;
    let api: jest.Mocked<ReviewApiService>;

    const createService = createServiceFactory({
        service: ReviewService,
        mocks: [ReviewApiService],
    });

    beforeEach(() => {
        spectator = createService();
        api = spectator.inject(ReviewApiService) as jest.Mocked<ReviewApiService>;
    });

    describe('getSummary', () => {
        it('maps status and passes through total/needsMyVote', done => {
            const dtos: ReviewSummaryDto[] = [{ versionId: 5, status: 3, total: 4, needsMyVote: false }];
            api.getSummary.mockReturnValue(of(dtos));

            spectator.service.getSummary('article', [5]).subscribe(result => {
                expect(api.getSummary).toHaveBeenCalledWith('article', [5]);
                expect(result).toEqual([{ versionId: 5, status: ReviewStatus.Disagree, total: 4, needsMyVote: false }]);
                done();
            });
        });

        it('maps null status to undefined', done => {
            const dtos: ReviewSummaryDto[] = [{ versionId: 6, status: null, total: 0, needsMyVote: true }];
            api.getSummary.mockReturnValue(of(dtos));

            spectator.service.getSummary('news', [6]).subscribe(result => {
                expect(result[0].status).toBeUndefined();
                expect(result[0].needsMyVote).toBe(true);
                done();
            });
        });
    });

    describe('getReviews', () => {
        it('maps status enum and parses updatedAt into a Date', done => {
            const dtos: ReviewDto[] = [
                {
                    reviewer: 'Анна',
                    status: 2,
                    statusLabel: 'Нужны правки',
                    comment: 'правка',
                    updatedAt: '2025-01-15 10:00:00',
                },
            ];
            api.getReviews.mockReturnValue(of(dtos));

            spectator.service.getReviews('article', 42).subscribe(result => {
                expect(api.getReviews).toHaveBeenCalledWith('article', 42);
                expect(result[0].status).toBe(ReviewStatus.Suggest);
                expect(result[0].comment).toBe('правка');
                expect(result[0].updatedAt).toBeInstanceOf(Date);
                done();
            });
        });
    });

    describe('setReview', () => {
        it('delegates to the API and maps the result', done => {
            api.setReview.mockReturnValue(
                of([{ reviewer: 'Иван', status: 1, statusLabel: 'Одобряю', comment: '', updatedAt: '2025-01-15' }]),
            );

            const request = { type: 'article', versionId: 5, status: 1, comment: '' } as const;
            spectator.service.setReview(request).subscribe(result => {
                expect(api.setReview).toHaveBeenCalledWith(request);
                expect(result[0].status).toBe(ReviewStatus.Approve);
                done();
            });
        });
    });

    describe('deleteReview', () => {
        it('delegates to the API and maps the result', done => {
            api.deleteReview.mockReturnValue(of([]));

            const request = { type: 'news', versionId: 9 } as const;
            spectator.service.deleteReview(request).subscribe(result => {
                expect(api.deleteReview).toHaveBeenCalledWith(request);
                expect(result).toEqual([]);
                done();
            });
        });
    });
});
