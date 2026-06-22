import { ReviewApiService } from './review-api.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { ApiResponse, ReviewDto, ReviewSummaryDto, SetReviewRequestDto } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

jest.mock('../../../environments/environment', () => ({
    environment: { apiUrl: 'http://test-api' },
}));

describe('ReviewApiService', () => {
    let spectator: SpectatorService<ReviewApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: ReviewApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => {
        httpController.verify();
    });

    describe('getSummary', () => {
        it('requests summary with comma-separated versionIds and unwraps data', done => {
            const summaries: ReviewSummaryDto[] = [
                { versionId: 5, status: 1, total: 3, needsMyVote: false },
                { versionId: 6, status: null, total: 0, needsMyVote: true },
            ];

            spectator.service.getSummary('article', [5, 6]).subscribe(result => {
                expect(result).toEqual(summaries);
                done();
            });

            const req = httpController.expectOne(r => r.url === 'http://test-api/api/reviews/summary/article');
            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('versionIds')).toBe('5,6');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
            req.flush({ success: true, data: summaries } satisfies ApiResponse<ReviewSummaryDto[]>);
        });

        it('targets the news endpoint for news type', done => {
            spectator.service.getSummary('news', [7]).subscribe(() => done());

            const req = httpController.expectOne(r => r.url === 'http://test-api/api/reviews/summary/news');
            req.flush({ success: true, data: [] } satisfies ApiResponse<ReviewSummaryDto[]>);
        });
    });

    describe('getReviews', () => {
        it('requests the per-version list endpoint and unwraps data', done => {
            const reviews: ReviewDto[] = [
                { reviewer: 'Анна', status: 1, statusLabel: 'Одобряю', comment: '', updatedAt: '2025-01-15 10:00:00' },
            ];

            spectator.service.getReviews('article', 42).subscribe(result => {
                expect(result).toEqual(reviews);
                done();
            });

            const req = httpController.expectOne('http://test-api/api/reviews/list/article/42');
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
            req.flush({ success: true, data: reviews } satisfies ApiResponse<ReviewDto[]>);
        });
    });

    describe('setReview', () => {
        it('posts the request body to the set endpoint', done => {
            const request: SetReviewRequestDto = {
                type: 'article',
                versionId: 5,
                status: 2,
                comment: 'правка',
            };

            spectator.service.setReview(request).subscribe(() => done());

            const req = httpController.expectOne('http://test-api/api/reviews/set');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: [] } satisfies ApiResponse<ReviewDto[]>);
        });
    });

    describe('deleteReview', () => {
        it('posts the request body to the delete endpoint', done => {
            spectator.service.deleteReview({ type: 'news', versionId: 9, reviewer: 'Борис' }).subscribe(() => done());

            const req = httpController.expectOne('http://test-api/api/reviews/delete');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ type: 'news', versionId: 9, reviewer: 'Борис' });
            req.flush({ success: true, data: [] } satisfies ApiResponse<ReviewDto[]>);
        });
    });
});
