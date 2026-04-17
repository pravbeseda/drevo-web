import { PictureArticleDto, PictureDto, PicturePendingDto, PicturePendingListResponseDto, PicturesListResponseDto } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { PictureApiService } from './picture-api.service';
import { PictureService } from './picture.service';

describe('PictureService', () => {
    let spectator: SpectatorService<PictureService>;
    let pictureApiService: jest.Mocked<PictureApiService>;

    const createService = createServiceFactory({
        service: PictureService,
        mocks: [PictureApiService],
    });

    beforeEach(() => {
        spectator = createService();
        pictureApiService = spectator.inject(PictureApiService) as jest.Mocked<PictureApiService>;
    });

    const mockPictureDto: PictureDto = {
        pic_id: 123,
        pic_folder: '004',
        pic_title: 'Храм Христа Спасителя',
        pic_user: 'Иван Иванов',
        pic_date: '2025-03-10T14:30:00+00:00',
        pic_width: 800,
        pic_height: 600,
    };

    const mockPendingDto: PicturePendingDto = {
        pp_id: 10,
        pp_pic_id: 123,
        pp_type: 'edit_title',
        pp_title: 'Новая подпись',
        pp_width: null,
        pp_height: null,
        pp_user: 'Пётр Петров',
        pp_date: '2025-03-11T10:00:00+00:00',
        pending: true,
        pic_title: 'Храм Христа Спасителя',
        pic_folder: '004',
        pic_width: 800,
        pic_height: 600,
    };

    const mockListResponseDto: PicturesListResponseDto = {
        items: [mockPictureDto],
        total: 100,
        page: 1,
        pageSize: 25,
        totalPages: 4,
    };

    describe('getPictures', () => {
        it('should call pictureApiService.getPictures with correct params', () => {
            pictureApiService.getPictures.mockReturnValue(of(mockListResponseDto));

            spectator.service.getPictures({ query: 'храм', page: 2, pageSize: 50 }).subscribe();

            expect(pictureApiService.getPictures).toHaveBeenCalledWith('храм', 2, 50);
        });

        it('should use default params when not provided', () => {
            pictureApiService.getPictures.mockReturnValue(of(mockListResponseDto));

            spectator.service.getPictures().subscribe();

            expect(pictureApiService.getPictures).toHaveBeenCalledWith('', 1, 25);
        });

        it('should map API response to frontend model', done => {
            pictureApiService.getPictures.mockReturnValue(of(mockListResponseDto));

            spectator.service.getPictures().subscribe(result => {
                expect(result.total).toBe(100);
                expect(result.page).toBe(1);
                expect(result.pageSize).toBe(25);
                expect(result.totalPages).toBe(4);
                expect(result.items).toHaveLength(1);

                const picture = result.items[0];
                expect(picture.id).toBe(123);
                expect(picture.folder).toBe('004');
                expect(picture.title).toBe('Храм Христа Спасителя');
                expect(picture.user).toBe('Иван Иванов');
                expect(picture.width).toBe(800);
                expect(picture.height).toBe(600);
                done();
            });
        });

        it('should convert date string to Date object', done => {
            pictureApiService.getPictures.mockReturnValue(of(mockListResponseDto));

            spectator.service.getPictures().subscribe(result => {
                expect(result.items[0].date).toBeInstanceOf(Date);
                expect(result.items[0].date.toISOString()).toBe('2025-03-10T14:30:00.000Z');
                done();
            });
        });

        it('should generate correct image and thumbnail URLs with cache buster', done => {
            pictureApiService.getPictures.mockReturnValue(of(mockListResponseDto));

            spectator.service.getPictures().subscribe(result => {
                const picture = result.items[0];
                const expectedTimestamp = new Date('2025-03-10T14:30:00+00:00').getTime();
                expect(picture.imageUrl).toBe(`/images/004/000123.jpg?v=${expectedTimestamp}`);
                expect(picture.thumbnailUrl).toBe(`/pictures/thumbs/004/000123.jpg?v=${expectedTimestamp}`);
                done();
            });
        });

        it('should handle empty results', done => {
            const emptyResponse: PicturesListResponseDto = {
                items: [],
                total: 0,
                page: 1,
                pageSize: 25,
                totalPages: 0,
            };
            pictureApiService.getPictures.mockReturnValue(of(emptyResponse));

            spectator.service.getPictures().subscribe(result => {
                expect(result.items).toHaveLength(0);
                expect(result.total).toBe(0);
                done();
            });
        });
    });

    describe('getPicture', () => {
        it('should call pictureApiService.getPicture with correct id', () => {
            pictureApiService.getPicture.mockReturnValue(of(mockPictureDto));

            spectator.service.getPicture(123).subscribe();

            expect(pictureApiService.getPicture).toHaveBeenCalledWith(123);
        });

        it('should map API response to frontend model', done => {
            pictureApiService.getPicture.mockReturnValue(of(mockPictureDto));

            spectator.service.getPicture(123).subscribe(result => {
                expect(result.id).toBe(123);
                expect(result.folder).toBe('004');
                expect(result.title).toBe('Храм Христа Спасителя');
                expect(result.user).toBe('Иван Иванов');
                expect(result.width).toBe(800);
                expect(result.height).toBe(600);
                done();
            });
        });

        it('should convert date string to Date object', done => {
            pictureApiService.getPicture.mockReturnValue(of(mockPictureDto));

            spectator.service.getPicture(123).subscribe(result => {
                expect(result.date).toBeInstanceOf(Date);
                done();
            });
        });

        it('should generate correct URLs with cache buster', done => {
            pictureApiService.getPicture.mockReturnValue(of(mockPictureDto));

            spectator.service.getPicture(123).subscribe(result => {
                const expectedTimestamp = new Date('2025-03-10T14:30:00+00:00').getTime();
                expect(result.imageUrl).toBe(`/images/004/000123.jpg?v=${expectedTimestamp}`);
                expect(result.thumbnailUrl).toBe(`/pictures/thumbs/004/000123.jpg?v=${expectedTimestamp}`);
                done();
            });
        });

        it('should convert null width/height to undefined', done => {
            const dtoWithNullDimensions: PictureDto = {
                ...mockPictureDto,
                pic_width: null,
                pic_height: null,
            };
            pictureApiService.getPicture.mockReturnValue(of(dtoWithNullDimensions));

            spectator.service.getPicture(123).subscribe(result => {
                expect(result.width).toBeUndefined();
                expect(result.height).toBeUndefined();
                done();
            });
        });

        it('should pad pic_id to 6 digits in URLs', done => {
            const smallIdDto: PictureDto = {
                ...mockPictureDto,
                pic_id: 5,
                pic_folder: '001',
            };
            pictureApiService.getPicture.mockReturnValue(of(smallIdDto));

            spectator.service.getPicture(5).subscribe(result => {
                const expectedTimestamp = new Date(mockPictureDto.pic_date).getTime();
                expect(result.imageUrl).toBe(`/images/001/000005.jpg?v=${expectedTimestamp}`);
                expect(result.thumbnailUrl).toBe(`/pictures/thumbs/001/000005.jpg?v=${expectedTimestamp}`);
                done();
            });
        });
    });

    describe('updateTitle', () => {
        it('should call pictureApiService.updateTitle with correct params', () => {
            pictureApiService.updateTitle.mockReturnValue(of(mockPictureDto));

            spectator.service.updateTitle(123, 'Новая подпись').subscribe();

            expect(pictureApiService.updateTitle).toHaveBeenCalledWith(123, 'Новая подпись');
        });

        it('should return picture when moderator (direct edit)', done => {
            const updatedDto: PictureDto = { ...mockPictureDto, pic_title: 'Новая подпись' };
            pictureApiService.updateTitle.mockReturnValue(of(updatedDto));

            spectator.service.updateTitle(123, 'Новая подпись').subscribe(result => {
                expect(result.picture).toBeDefined();
                expect(result.picture?.title).toBe('Новая подпись');
                expect(result.pending).toBeUndefined();
                done();
            });
        });

        it('should return pending when regular user', done => {
            pictureApiService.updateTitle.mockReturnValue(of(mockPendingDto));

            spectator.service.updateTitle(123, 'Новая подпись').subscribe(result => {
                expect(result.pending).toBeDefined();
                expect(result.pending?.title).toBe('Новая подпись');
                expect(result.pending?.pendingType).toBe('edit_title');
                expect(result.picture).toBeUndefined();
                done();
            });
        });
    });

    describe('editPicture', () => {
        it('should call pictureApiService.editPicture with correct params', () => {
            pictureApiService.editPicture.mockReturnValue(of(mockPictureDto));
            const formData = new FormData();

            spectator.service.editPicture(123, formData).subscribe();

            expect(pictureApiService.editPicture).toHaveBeenCalledWith(123, formData);
        });

        it('should return picture when moderator', done => {
            pictureApiService.editPicture.mockReturnValue(of(mockPictureDto));

            spectator.service.editPicture(123, new FormData()).subscribe(result => {
                expect(result.picture).toBeDefined();
                expect(result.pending).toBeUndefined();
                done();
            });
        });

        it('should return pending when regular user', done => {
            const filePending: PicturePendingDto = { ...mockPendingDto, pp_type: 'edit_both', pp_width: 1024, pp_height: 768 };
            pictureApiService.editPicture.mockReturnValue(of(filePending));

            spectator.service.editPicture(123, new FormData()).subscribe(result => {
                expect(result.pending).toBeDefined();
                expect(result.pending?.pendingType).toBe('edit_both');
                expect(result.pending?.pendingImageUrl).toBe('/images/pending/123_pp10.jpg');
                expect(result.picture).toBeUndefined();
                done();
            });
        });
    });

    describe('deletePicture', () => {
        it('should call pictureApiService.deletePicture with correct id', () => {
            pictureApiService.deletePicture.mockReturnValue(of(mockPictureDto));

            spectator.service.deletePicture(123).subscribe();

            expect(pictureApiService.deletePicture).toHaveBeenCalledWith(123);
        });

        it('should return picture when moderator (direct delete)', done => {
            pictureApiService.deletePicture.mockReturnValue(of(mockPictureDto));

            spectator.service.deletePicture(123).subscribe(result => {
                expect(result.picture).toBeDefined();
                expect(result.picture?.id).toBe(123);
                expect(result.pending).toBeUndefined();
                done();
            });
        });

        it('should return pending when regular user', done => {
            pictureApiService.deletePicture.mockReturnValue(of(mockPendingDto));

            spectator.service.deletePicture(123).subscribe(result => {
                expect(result.pending).toBeDefined();
                expect(result.pending?.id).toBe(10);
                expect(result.pending?.pendingType).toBe('edit_title');
                expect(result.picture).toBeUndefined();
                done();
            });
        });
    });

    describe('getPending', () => {
        it('should map pending list response', done => {
            const pendingListDto: PicturePendingListResponseDto = {
                items: [mockPendingDto],
                total: 1,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            };
            pictureApiService.getPending.mockReturnValue(of(pendingListDto));

            spectator.service.getPending().subscribe(result => {
                expect(result.total).toBe(1);
                expect(result.items).toHaveLength(1);

                const pending = result.items[0];
                expect(pending.id).toBe(10);
                expect(pending.pictureId).toBe(123);
                expect(pending.pendingType).toBe('edit_title');
                expect(pending.title).toBe('Новая подпись');
                expect(pending.user).toBe('Пётр Петров');
                expect(pending.date).toBeInstanceOf(Date);
                expect(pending.currentTitle).toBe('Храм Христа Спасителя');
                expect(pending.currentImageUrl).toBe('/images/004/000123.jpg');
                expect(pending.currentThumbnailUrl).toBe('/pictures/thumbs/004/000123.jpg');
                expect(pending.pendingImageUrl).toBeUndefined();
                done();
            });
        });

        it('should generate pendingImageUrl for file changes', done => {
            const filePendingDto: PicturePendingDto = {
                ...mockPendingDto,
                pp_type: 'edit_file',
                pp_width: 1024,
                pp_height: 768,
            };
            const pendingListDto: PicturePendingListResponseDto = {
                items: [filePendingDto],
                total: 1,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            };
            pictureApiService.getPending.mockReturnValue(of(pendingListDto));

            spectator.service.getPending().subscribe(result => {
                expect(result.items[0].pendingImageUrl).toBe('/images/pending/123_pp10.jpg');
                done();
            });
        });
    });

    describe('getPicturePending', () => {
        it('should delegate to pictureApiService with picture id', () => {
            pictureApiService.getPicturePending.mockReturnValue(of([mockPendingDto]));

            spectator.service.getPicturePending(123).subscribe();

            expect(pictureApiService.getPicturePending).toHaveBeenCalledWith(123);
        });

        it('should map picture pending DTOs to frontend model', done => {
            const filePendingDto: PicturePendingDto = {
                ...mockPendingDto,
                pp_type: 'edit_both',
                pp_width: 1024,
                pp_height: 768,
            };
            pictureApiService.getPicturePending.mockReturnValue(of([filePendingDto]));

            spectator.service.getPicturePending(123).subscribe(result => {
                expect(result).toHaveLength(1);
                expect(result[0]).toEqual(
                    expect.objectContaining({
                        id: 10,
                        pictureId: 123,
                        pendingType: 'edit_both',
                        title: 'Новая подпись',
                        user: 'Пётр Петров',
                        pendingImageUrl: '/images/pending/123_pp10.jpg',
                    }),
                );
                done();
            });
        });
    });

    describe('approvePending', () => {
        it('should delegate to pictureApiService', () => {
            pictureApiService.approvePending.mockReturnValue(of(undefined));

            spectator.service.approvePending(10).subscribe();

            expect(pictureApiService.approvePending).toHaveBeenCalledWith(10);
        });
    });

    describe('rejectPending', () => {
        it('should delegate to pictureApiService', () => {
            pictureApiService.rejectPending.mockReturnValue(of(undefined));

            spectator.service.rejectPending(10).subscribe();

            expect(pictureApiService.rejectPending).toHaveBeenCalledWith(10);
        });
    });

    describe('cancelPending', () => {
        it('should delegate to pictureApiService', () => {
            pictureApiService.cancelPending.mockReturnValue(of(undefined));

            spectator.service.cancelPending(10).subscribe();

            expect(pictureApiService.cancelPending).toHaveBeenCalledWith(10);
        });
    });

    describe('getPictureArticles', () => {
        it('should return articles from API', done => {
            const articles: readonly PictureArticleDto[] = [
                { id: 1, title: 'Статья 1' },
                { id: 2, title: 'Статья 2' },
            ];
            pictureApiService.getPictureArticles.mockReturnValue(of(articles));

            spectator.service.getPictureArticles(123).subscribe(result => {
                expect(result).toEqual(articles);
                done();
            });
        });
    });
});
