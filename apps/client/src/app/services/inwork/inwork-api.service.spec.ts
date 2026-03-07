import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { InworkApiService } from './inwork-api.service';

describe('InworkApiService', () => {
    let spectator: SpectatorService<InworkApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: InworkApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
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

    describe('check', () => {
        it('should send GET request with module and title params', () => {
            spectator.service.check('articles', 'Test Title').subscribe();

            const req = httpController.expectOne(r => r.url === '/api/inwork/check');
            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('module')).toBe('articles');
            expect(req.request.params.get('title')).toBe('Test Title');
            req.flush({ success: true, data: { editor: 'User1' } });
        });

        it('should send request with credentials', () => {
            spectator.service.check('articles', 'Test').subscribe();

            const req = httpController.expectOne(r => r.url === '/api/inwork/check');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: { editor: undefined } });
        });

        it('should return editor from response data', () => {
            let result: { editor?: string } | undefined;
            spectator.service.check('articles', 'Test').subscribe(r => {
                result = r;
            });

            httpController.expectOne(r => r.url === '/api/inwork/check').flush({
                success: true,
                data: { editor: 'User1' },
            });

            expect(result).toEqual({ editor: 'User1' });
        });

        it('should return default value when response data is undefined', () => {
            let result: { editor?: string } | undefined;
            spectator.service.check('articles', 'Test').subscribe(r => {
                result = r;
            });

            httpController.expectOne(r => r.url === '/api/inwork/check').flush({
                success: true,
                data: undefined,
            });

            expect(result).toEqual({ editor: undefined });
        });
    });

    describe('getList', () => {
        it('should send GET request to /api/inwork/list', () => {
            spectator.service.getList().subscribe();

            const req = httpController.expectOne('/api/inwork/list');
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: [] });
        });

        it('should return items from response data', () => {
            const items = [{ id: 1, module: 'articles', title: 'Test', author: 'User', lasttime: '2024-01-01', age: 10 }];
            let result: unknown;
            spectator.service.getList().subscribe(r => {
                result = r;
            });

            httpController.expectOne('/api/inwork/list').flush({ success: true, data: items });

            expect(result).toEqual(items);
        });

        it('should return empty array when response data is undefined', () => {
            let result: unknown;
            spectator.service.getList().subscribe(r => {
                result = r;
            });

            httpController.expectOne('/api/inwork/list').flush({ success: true, data: undefined });

            expect(result).toEqual([]);
        });
    });

    describe('markEditing', () => {
        it('should send POST request with module, title, and versionId', () => {
            spectator.service.markEditing('articles', 'Test Title', 456).subscribe();

            const req = httpController.expectOne('/api/inwork/mark');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ module: 'articles', title: 'Test Title', versionId: 456 });
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: undefined });
        });
    });

    describe('clearEditing', () => {
        it('should send POST request with module and title', () => {
            spectator.service.clearEditing('articles', 'Test Title').subscribe();

            const req = httpController.expectOne('/api/inwork/clear');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ module: 'articles', title: 'Test Title' });
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: undefined });
        });
    });
});
