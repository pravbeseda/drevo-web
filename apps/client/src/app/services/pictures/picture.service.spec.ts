import { PictureDto, PicturesListResponseDto } from '@drevo-web/shared';
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

        it('should generate correct image and thumbnail URLs', done => {
            pictureApiService.getPictures.mockReturnValue(of(mockListResponseDto));

            spectator.service.getPictures().subscribe(result => {
                const picture = result.items[0];
                expect(picture.imageUrl).toBe('/images/004/000123.jpg');
                expect(picture.thumbnailUrl).toBe('/pictures/thumbs/004/000123.jpg');
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

        it('should generate correct URLs', done => {
            pictureApiService.getPicture.mockReturnValue(of(mockPictureDto));

            spectator.service.getPicture(123).subscribe(result => {
                expect(result.imageUrl).toBe('/images/004/000123.jpg');
                expect(result.thumbnailUrl).toBe('/pictures/thumbs/004/000123.jpg');
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
                expect(result.imageUrl).toBe('/images/001/000005.jpg');
                expect(result.thumbnailUrl).toBe('/pictures/thumbs/001/000005.jpg');
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

        it('should map API response to frontend model', done => {
            const updatedDto: PictureDto = { ...mockPictureDto, pic_title: 'Новая подпись' };
            pictureApiService.updateTitle.mockReturnValue(of(updatedDto));

            spectator.service.updateTitle(123, 'Новая подпись').subscribe(result => {
                expect(result.title).toBe('Новая подпись');
                expect(result.id).toBe(123);
                done();
            });
        });
    });
});
