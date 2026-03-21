import { PictureService } from '../../../services/pictures';
import { PicturesStateService } from './pictures-state.service';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { Picture, PictureListResponse } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';

const DEBOUNCE_TIME_MS = 500;

describe('PicturesStateService', () => {
    let spectator: SpectatorService<PicturesStateService>;
    let pictureService: jest.Mocked<PictureService>;

    const makePicture = (id: number): Picture => ({
        id,
        folder: '001',
        title: `Picture ${id}`,
        user: 'user',
        date: new Date(),
        width: 800,
        height: 600,
        imageUrl: `/images/001/${String(id).padStart(6, '0')}.jpg`,
        thumbnailUrl: `/pictures/thumbs/001/${String(id).padStart(6, '0')}.jpg`,
    });

    const mockResponse: PictureListResponse = {
        items: Array.from({ length: 5 }, (_, i) => makePicture(i + 1)),
        total: 20,
        page: 1,
        pageSize: 25,
        totalPages: 1,
    };

    const createService = createServiceFactory({
        service: PicturesStateService,
        mocks: [PictureService],
        providers: [mockLoggerProvider()],
    });

    beforeEach(() => {
        jest.useFakeTimers();
        spectator = createService();
        pictureService = spectator.inject(PictureService) as jest.Mocked<PictureService>;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('init', () => {
        it('should load pictures on init', () => {
            pictureService.getPictures.mockReturnValue(of(mockResponse));

            spectator.service.init();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(pictureService.getPictures).toHaveBeenCalledWith({ query: '', page: 1 });
            expect(spectator.service.totalItems()).toBe(20);
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should handle errors gracefully', () => {
            pictureService.getPictures.mockReturnValue(throwError(() => new Error('Network error')));

            spectator.service.init();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(spectator.service.totalItems()).toBe(0);
            expect(spectator.service.isLoading()).toBe(false);
        });
    });

    describe('onSearchChange', () => {
        it('should trigger search with debounce', () => {
            pictureService.getPictures.mockReturnValue(of(mockResponse));

            spectator.service.init();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
            pictureService.getPictures.mockClear();

            spectator.service.onSearchChange('храм');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(pictureService.getPictures).toHaveBeenCalledWith({ query: 'храм', page: 1 });
        });

        it('should update searchQuery signal', () => {
            pictureService.getPictures.mockReturnValue(of(mockResponse));
            spectator.service.init();

            spectator.service.onSearchChange('test');

            expect(spectator.service.searchQuery()).toBe('test');
        });
    });

    describe('loadMore', () => {
        it('should load next page and append items', () => {
            pictureService.getPictures.mockReturnValue(of(mockResponse));

            spectator.service.init();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            const moreResponse: PictureListResponse = {
                items: Array.from({ length: 5 }, (_, i) => makePicture(i + 6)),
                total: 20,
                page: 2,
                pageSize: 25,
                totalPages: 1,
            };
            pictureService.getPictures.mockReturnValue(of(moreResponse));

            spectator.service.loadMore();

            expect(pictureService.getPictures).toHaveBeenCalledWith({ query: '', page: 2 });
            expect(spectator.service.isLoadingMore()).toBe(false);
        });

        it('should not load more when all items are loaded', () => {
            const completeResponse: PictureListResponse = {
                items: Array.from({ length: 5 }, (_, i) => makePicture(i + 1)),
                total: 5,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            };
            pictureService.getPictures.mockReturnValue(of(completeResponse));

            spectator.service.init();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
            pictureService.getPictures.mockClear();

            spectator.service.loadMore();

            expect(pictureService.getPictures).not.toHaveBeenCalled();
        });
    });

    describe('rows', () => {
        it('should return empty rows when container width is 0', () => {
            pictureService.getPictures.mockReturnValue(of(mockResponse));

            spectator.service.init();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(spectator.service.rows()).toEqual([]);
        });

        it('should build rows when container width is set', () => {
            pictureService.getPictures.mockReturnValue(of(mockResponse));

            spectator.service.init();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
            spectator.service.onContainerResize(1000);

            const rows = spectator.service.rows();
            expect(rows.length).toBeGreaterThan(0);

            const totalItems = rows.reduce((sum, row) => sum + row.items.length, 0);
            expect(totalItems).toBe(5);
        });
    });

    describe('hasResults / showNoResults', () => {
        it('should report hasResults when pictures are loaded', () => {
            pictureService.getPictures.mockReturnValue(of(mockResponse));

            spectator.service.init();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(spectator.service.hasResults()).toBe(true);
            expect(spectator.service.showNoResults()).toBe(false);
        });

        it('should report showNoResults when search returns empty', () => {
            pictureService.getPictures.mockReturnValue(of(mockResponse));
            spectator.service.init();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            const emptyResponse: PictureListResponse = {
                items: [],
                total: 0,
                page: 1,
                pageSize: 25,
                totalPages: 0,
            };
            pictureService.getPictures.mockReturnValue(of(emptyResponse));

            spectator.service.onSearchChange('nonexistent');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(spectator.service.hasResults()).toBe(false);
            expect(spectator.service.showNoResults()).toBe(true);
        });
    });
});
