import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { PictureApiService } from './picture-api.service';

describe('PictureApiService', () => {
    let spectator: SpectatorService<PictureApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: PictureApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => {
        httpController.verify();
    });

    const createMockListResponse = (items: unknown[] = [], page = 1, pageSize = 25, total = 0) => ({
        success: true,
        data: {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 0,
        },
    });

    const mockPictureDto = {
        pic_id: 123,
        pic_folder: '004',
        pic_title: 'Храм Христа Спасителя',
        pic_user: 'Иван Иванов',
        pic_date: '2025-03-10 14:30:00',
        pic_width: 800,
        pic_height: 600,
    };

    describe('getPictures', () => {
        it('should call HTTP GET with correct URL and params', () => {
            spectator.service.getPictures('храм', 2, 50).subscribe(result => {
                expect(result.items).toHaveLength(1);
            });

            const req = httpController.expectOne(
                request =>
                    request.url === '/api/pictures' &&
                    request.params.get('q') === 'храм' &&
                    request.params.get('page') === '2' &&
                    request.params.get('size') === '50',
            );
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush(createMockListResponse([mockPictureDto], 2, 50, 100));
        });

        it('should use default page and pageSize when not provided', () => {
            spectator.service.getPictures().subscribe();

            const req = httpController.expectOne(
                request =>
                    request.url === '/api/pictures' &&
                    request.params.get('page') === '1' &&
                    request.params.get('size') === '25',
            );
            req.flush(createMockListResponse());
        });

        it('should not include q param when query is empty', () => {
            spectator.service.getPictures('').subscribe();

            const req = httpController.expectOne(
                request => request.url === '/api/pictures' && !request.params.has('q'),
            );
            req.flush(createMockListResponse());
        });

        it('should trim query before sending', () => {
            spectator.service.getPictures('  храм  ').subscribe();

            const req = httpController.expectOne(
                request => request.url === '/api/pictures' && request.params.get('q') === 'храм',
            );
            req.flush(createMockListResponse());
        });

        it('should extract data from response wrapper', done => {
            spectator.service.getPictures().subscribe(result => {
                expect(result.total).toBe(1);
                expect(result.items).toHaveLength(1);
                done();
            });

            const req = httpController.expectOne(request => request.url === '/api/pictures');
            req.flush(createMockListResponse([mockPictureDto], 1, 25, 1));
        });

        it('should throw when response.data is undefined', done => {
            spectator.service.getPictures().subscribe({
                error: (err: Error) => {
                    expect(err.message).toContain('Response data is undefined');
                    done();
                },
            });

            const req = httpController.expectOne(request => request.url === '/api/pictures');
            req.flush({ success: true, data: undefined });
        });

        it('should propagate HTTP 500 errors', done => {
            spectator.service.getPictures().subscribe({
                error: err => {
                    expect(err.status).toBe(500);
                    done();
                },
            });

            const req = httpController.expectOne(request => request.url === '/api/pictures');
            req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
        });
    });

    describe('getPicture', () => {
        it('should call HTTP GET with correct URL', () => {
            spectator.service.getPicture(123).subscribe(result => {
                expect(result).toEqual(mockPictureDto);
            });

            const req = httpController.expectOne('/api/pictures/123');
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: mockPictureDto });
        });

        it('should extract data from response wrapper', done => {
            spectator.service.getPicture(123).subscribe(result => {
                expect(result.pic_id).toBe(123);
                expect(result.pic_title).toBe('Храм Христа Спасителя');
                done();
            });

            const req = httpController.expectOne('/api/pictures/123');
            req.flush({ success: true, data: mockPictureDto });
        });

        it('should throw when response.data is undefined', done => {
            spectator.service.getPicture(123).subscribe({
                error: (err: Error) => {
                    expect(err.message).toContain('Response data is undefined');
                    done();
                },
            });

            const req = httpController.expectOne('/api/pictures/123');
            req.flush({ success: true, data: undefined });
        });

        it('should propagate HTTP 404 errors', done => {
            spectator.service.getPicture(999).subscribe({
                error: err => {
                    expect(err.status).toBe(404);
                    done();
                },
            });

            const req = httpController.expectOne('/api/pictures/999');
            req.flush({ success: false, error: 'Not found' }, { status: 404, statusText: 'Not Found' });
        });
    });

    describe('updateTitle', () => {
        it('should call HTTP PATCH with correct URL and body', () => {
            spectator.service.updateTitle(123, 'Новая подпись').subscribe(result => {
                expect(result.pic_title).toBe('Новая подпись');
            });

            const req = httpController.expectOne('/api/pictures/123');
            expect(req.request.method).toBe('PATCH');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.body).toEqual({ pic_title: 'Новая подпись' });
            req.flush({ success: true, data: { ...mockPictureDto, pic_title: 'Новая подпись' } });
        });

        it('should throw when response.data is undefined', done => {
            spectator.service.updateTitle(123, 'Новая подпись').subscribe({
                error: (err: Error) => {
                    expect(err.message).toContain('Response data is undefined');
                    done();
                },
            });

            const req = httpController.expectOne('/api/pictures/123');
            req.flush({ success: true, data: undefined });
        });

        it('should propagate HTTP 403 errors', done => {
            spectator.service.updateTitle(123, 'Новая подпись').subscribe({
                error: err => {
                    expect(err.status).toBe(403);
                    done();
                },
            });

            const req = httpController.expectOne('/api/pictures/123');
            req.flush({ success: false, error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
        });
    });
});
