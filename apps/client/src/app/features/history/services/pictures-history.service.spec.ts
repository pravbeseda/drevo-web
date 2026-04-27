import { PicturesHistoryService, buildDisplayItems } from './pictures-history.service';
import { PictureService } from '../../../services/pictures/picture.service';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { Picture, PicturePending, PicturePendingListResponse, PictureListResponse } from '@drevo-web/shared';

const createPending = (overrides: Partial<PicturePending> = {}): PicturePending => ({
    id: 1,
    pictureId: 10,
    pendingType: 'edit_title',
    title: 'New Title',
    width: undefined,
    height: undefined,
    user: 'otheruser',
    date: new Date('2026-04-25'),
    currentTitle: 'Old Title',
    currentImageUrl: '/images/folder/000010.jpg',
    currentThumbnailUrl: '/pictures/thumbs/folder/000010.jpg',
    currentWidth: 800,
    currentHeight: 600,
    pendingImageUrl: undefined,
    ...overrides,
});

const createPicture = (overrides: Partial<Picture> = {}): Picture => ({
    id: 10,
    folder: 'folder',
    title: 'Test Picture',
    user: 'testuser',
    date: new Date('2026-04-25'),
    width: 800,
    height: 600,
    imageUrl: '/images/folder/000010.jpg',
    thumbnailUrl: '/pictures/thumbs/folder/000010.jpg',
    ...overrides,
});

const EMPTY_PENDING_RESPONSE: PicturePendingListResponse = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 200,
    totalPages: 0,
};

const EMPTY_RECENT_RESPONSE: PictureListResponse = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
};

describe('PicturesHistoryService', () => {
    let spectator: SpectatorService<PicturesHistoryService>;
    let mockPictureService: {
        getPending: jest.Mock;
        getPictures: jest.Mock;
    };

    const createService = createServiceFactory({
        service: PicturesHistoryService,
        providers: [
            mockLoggerProvider(),
            {
                provide: PictureService,
                useFactory: () => mockPictureService,
            },
        ],
    });

    beforeEach(() => {
        mockPictureService = {
            getPending: jest.fn().mockReturnValue(of(EMPTY_PENDING_RESPONSE)),
            getPictures: jest.fn().mockReturnValue(of(EMPTY_RECENT_RESPONSE)),
        };
        spectator = createService();
    });

    describe('init', () => {
        it('should load pending and recent pictures', () => {
            const pendingResponse: PicturePendingListResponse = {
                items: [createPending()],
                total: 1,
                page: 1,
                pageSize: 200,
                totalPages: 1,
            };
            const recentResponse: PictureListResponse = {
                items: [createPicture()],
                total: 1,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            };

            mockPictureService.getPending.mockReturnValue(of(pendingResponse));
            mockPictureService.getPictures.mockReturnValue(of(recentResponse));

            spectator.service.init();

            expect(mockPictureService.getPending).toHaveBeenCalledWith(1, 200);
            expect(mockPictureService.getPictures).toHaveBeenCalledWith({ page: 1 });
            expect(spectator.service.hasPendingItems()).toBe(true);
            expect(spectator.service.hasRecentItems()).toBe(true);
        });

        it('should set error state on pending load failure', () => {
            mockPictureService.getPending.mockReturnValue(throwError(() => new Error('fail')));

            spectator.service.init();

            expect(spectator.service.hasPendingError()).toBe(true);
            expect(spectator.service.isPendingLoading()).toBe(false);
        });

        it('should set error state on recent load failure', () => {
            mockPictureService.getPictures.mockReturnValue(throwError(() => new Error('fail')));

            spectator.service.init();

            expect(spectator.service.hasRecentError()).toBe(true);
            expect(spectator.service.isRecentLoading()).toBe(false);
        });
    });

    describe('pendingGroups', () => {
        it('should group pending items by pictureId', () => {
            const pending1 = createPending({ id: 1, pictureId: 10 });
            const pending2 = createPending({ id: 2, pictureId: 10, pendingType: 'edit_file' });
            const pending3 = createPending({ id: 3, pictureId: 20, currentTitle: 'Other' });

            mockPictureService.getPending.mockReturnValue(
                of({
                    items: [pending1, pending2, pending3],
                    total: 3,
                    page: 1,
                    pageSize: 200,
                    totalPages: 1,
                }),
            );

            spectator.service.init();

            const groups = spectator.service.pendingGroups();
            expect(groups).toHaveLength(2);
            expect(groups[0].pictureId).toBe(10);
            expect(groups[0].items).toHaveLength(2);
            expect(groups[1].pictureId).toBe(20);
            expect(groups[1].items).toHaveLength(1);
        });
    });

    describe('onLoadMore', () => {
        it('should load next page', () => {
            mockPictureService.getPictures.mockReturnValue(
                of({
                    items: Array.from({ length: 25 }, (_, i) => createPicture({ id: i })),
                    total: 50,
                    page: 1,
                    pageSize: 25,
                    totalPages: 2,
                }),
            );

            spectator.service.init();

            mockPictureService.getPictures.mockReturnValue(
                of({
                    items: Array.from({ length: 25 }, (_, i) => createPicture({ id: i + 25 })),
                    total: 50,
                    page: 2,
                    pageSize: 25,
                    totalPages: 2,
                }),
            );

            spectator.service.onLoadMore();

            expect(mockPictureService.getPictures).toHaveBeenCalledWith({ page: 2 });
        });

        it('should not load more when all items loaded', () => {
            mockPictureService.getPictures.mockReturnValue(
                of({
                    items: [createPicture()],
                    total: 1,
                    page: 1,
                    pageSize: 25,
                    totalPages: 1,
                }),
            );

            spectator.service.init();
            mockPictureService.getPictures.mockClear();

            spectator.service.onLoadMore();

            expect(mockPictureService.getPictures).not.toHaveBeenCalled();
        });
    });
});

describe('buildDisplayItems', () => {
    const referenceDate = new Date('2026-04-26');

    it('should return empty array for empty input', () => {
        expect(buildDisplayItems([], referenceDate)).toEqual([]);
    });

    it('should insert date headers between groups', () => {
        const items: Picture[] = [
            {
                id: 1,
                folder: 'f',
                title: 'A',
                user: 'u',
                date: new Date('2026-04-26'),
                width: undefined,
                height: undefined,
                imageUrl: '',
                thumbnailUrl: '',
            },
            {
                id: 2,
                folder: 'f',
                title: 'B',
                user: 'u',
                date: new Date('2026-04-25'),
                width: undefined,
                height: undefined,
                imageUrl: '',
                thumbnailUrl: '',
            },
        ];

        const result = buildDisplayItems(items, referenceDate);

        expect(result).toHaveLength(4);
        expect(result[0]).toEqual({ type: 'header', date: 'Сегодня' });
        expect(result[1]).toEqual({ type: 'picture', data: items[0] });
        expect(result[2]).toEqual({ type: 'header', date: 'Вчера' });
        expect(result[3]).toEqual({ type: 'picture', data: items[1] });
    });
});
