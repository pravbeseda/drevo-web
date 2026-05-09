import { CountsApiService } from './counts-api.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { HistoryCountsDto } from '@drevo-web/shared';

describe('CountsApiService', () => {
    let spectator: SpectatorService<CountsApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: CountsApiService,
        imports: [HttpClientTestingModule],
    });

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => {
        httpController.verify();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should call GET /api/counts and return data', () => {
        const mockCounts: HistoryCountsDto = { pendingArticles: 3, pendingNews: 1, pendingPictures: 0 };

        spectator.service.getHistoryCounts().subscribe(result => {
            expect(result).toEqual(mockCounts);
        });

        const req = httpController.expectOne('/api/counts');
        expect(req.request.method).toBe('GET');
        expect(req.request.withCredentials).toBe(true);
        req.flush({ success: true, data: mockCounts });
    });
});
