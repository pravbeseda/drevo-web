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

    const mockPendingDto = {
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
                expect((result as { pic_title: string }).pic_title).toBe('Новая подпись');
            });

            const req = httpController.expectOne('/api/pictures/123');
            expect(req.request.method).toBe('PATCH');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.body).toEqual({ pic_title: 'Новая подпись' });
            req.flush({ success: true, data: { ...mockPictureDto, pic_title: 'Новая подпись' } });
        });

        it('should return pending DTO when regular user', done => {
            spectator.service.updateTitle(123, 'Новая подпись').subscribe(result => {
                expect((result as { pending: boolean }).pending).toBe(true);
                done();
            });

            const req = httpController.expectOne('/api/pictures/123');
            req.flush({ success: true, data: mockPendingDto });
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

    describe('editPicture', () => {
        it('should call HTTP POST to /file endpoint with FormData', () => {
            const formData = new FormData();
            formData.append('pic_title', 'Новая подпись');

            spectator.service.editPicture(123, formData).subscribe();

            const req = httpController.expectOne('/api/pictures/123/file');
            expect(req.request.method).toBe('POST');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.body).toBe(formData);
            req.flush({ success: true, data: mockPictureDto });
        });
    });

    describe('deletePicture', () => {
        it('should call HTTP DELETE with correct URL', () => {
            spectator.service.deletePicture(123).subscribe();

            const req = httpController.expectOne('/api/pictures/123');
            expect(req.request.method).toBe('DELETE');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: mockPictureDto });
        });

        it('should propagate HTTP 409 errors', done => {
            spectator.service.deletePicture(123).subscribe({
                error: err => {
                    expect(err.status).toBe(409);
                    done();
                },
            });

            const req = httpController.expectOne('/api/pictures/123');
            req.flush(
                { success: false, error: 'Иллюстрация используется в статьях', data: { articles: [{ id: 1, title: 'Статья' }] } },
                { status: 409, statusText: 'Conflict' },
            );
        });
    });

    describe('getPending', () => {
        it('should call HTTP GET with pagination params', () => {
            spectator.service.getPending(2, 50).subscribe();

            const req = httpController.expectOne(
                request =>
                    request.url === '/api/pictures/pending' &&
                    request.params.get('page') === '2' &&
                    request.params.get('size') === '50',
            );
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: { items: [], total: 0, page: 2, pageSize: 50, totalPages: 0 } });
        });

        it('should use default pagination', () => {
            spectator.service.getPending().subscribe();

            const req = httpController.expectOne(
                request =>
                    request.url === '/api/pictures/pending' &&
                    request.params.get('page') === '1' &&
                    request.params.get('size') === '25',
            );
            req.flush({ success: true, data: { items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 } });
        });
    });

    describe('approvePending', () => {
        it('should call HTTP POST with correct URL', () => {
            spectator.service.approvePending(10).subscribe();

            const req = httpController.expectOne('/api/pictures/pending/10/approve');
            expect(req.request.method).toBe('POST');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: null });
        });
    });

    describe('rejectPending', () => {
        it('should call HTTP POST with correct URL', () => {
            spectator.service.rejectPending(10).subscribe();

            const req = httpController.expectOne('/api/pictures/pending/10/reject');
            expect(req.request.method).toBe('POST');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: null });
        });
    });

    describe('cancelPending', () => {
        it('should call HTTP POST with correct URL', () => {
            spectator.service.cancelPending(10).subscribe();

            const req = httpController.expectOne('/api/pictures/pending/10/cancel');
            expect(req.request.method).toBe('POST');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: null });
        });
    });

    describe('getPictureArticles', () => {
        it('should call HTTP GET with correct URL', done => {
            spectator.service.getPictureArticles(123).subscribe(result => {
                expect(result).toEqual([
                    { id: 1, title: 'Статья 1' },
                    { id: 2, title: 'Статья 2' },
                ]);
                done();
            });

            const req = httpController.expectOne('/api/pictures/123/articles');
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush({
                success: true,
                data: {
                    items: [
                        { id: 1, title: 'Статья 1' },
                        { id: 2, title: 'Статья 2' },
                    ],
                },
            });
        });

        it('should return empty array when no articles', done => {
            spectator.service.getPictureArticles(123).subscribe(result => {
                expect(result).toEqual([]);
                done();
            });

            const req = httpController.expectOne('/api/pictures/123/articles');
            req.flush({ success: true, data: { items: [] } });
        });
    });
});
