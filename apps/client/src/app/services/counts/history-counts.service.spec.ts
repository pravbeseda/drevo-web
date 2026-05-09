import { CountsApiService } from './counts-api.service';
import { HistoryCountsService } from './history-counts.service';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { of, throwError } from 'rxjs';

describe('HistoryCountsService', () => {
    let spectator: SpectatorService<HistoryCountsService>;
    const mockCountsApiService = {
        getHistoryCounts: jest.fn(),
    };

    const createService = createServiceFactory({
        service: HistoryCountsService,
        providers: [
            { provide: CountsApiService, useValue: mockCountsApiService },
            mockLoggerProvider(),
        ],
    });

    beforeEach(() => {
        mockCountsApiService.getHistoryCounts.mockClear();
        spectator = createService();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should have undefined counts initially', () => {
        expect(spectator.service.counts()).toBeUndefined();
    });

    it('should load counts and update signal', () => {
        const mockCounts = { pendingArticles: 3, pendingNews: 1, pendingPictures: 0 };
        mockCountsApiService.getHistoryCounts.mockReturnValue(of(mockCounts));

        spectator.service.loadCounts();

        expect(spectator.service.counts()).toEqual(mockCounts);
    });

    it('should keep undefined on error', () => {
        mockCountsApiService.getHistoryCounts.mockReturnValue(throwError(() => new Error('Network error')));

        spectator.service.loadCounts();

        expect(spectator.service.counts()).toBeUndefined();
    });
});
