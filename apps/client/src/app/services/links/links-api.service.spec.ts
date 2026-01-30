import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LinksApiService } from './links-api.service';

describe('LinksApiService', () => {
    let spectator: SpectatorService<LinksApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: LinksApiService,
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

    describe('checkLinks', () => {
        it('should send POST request to /api/links/check', () => {
            spectator.service.checkLinks(['link1']).subscribe();

            const req = httpController.expectOne('/api/links/check');
            expect(req.request.method).toBe('POST');
            req.flush({ link1: { isExist: true } });
        });

        it('should send links as URL-encoded body with links[] keys', () => {
            spectator.service
                .checkLinks(['link1', 'link2'])
                .subscribe();

            const req = httpController.expectOne('/api/links/check');
            expect(req.request.body).toBe('links%5B%5D=link1&links%5B%5D=link2');
            req.flush({
                link1: { isExist: true },
                link2: { isExist: false },
            });
        });

        it('should set Content-Type header to application/x-www-form-urlencoded', () => {
            spectator.service.checkLinks(['link1']).subscribe();

            const req = httpController.expectOne('/api/links/check');
            expect(req.request.headers.get('Content-Type')).toBe(
                'application/x-www-form-urlencoded'
            );
            req.flush({ link1: { isExist: true } });
        });

        it('should set X-Requested-With header', () => {
            spectator.service.checkLinks(['link1']).subscribe();

            const req = httpController.expectOne('/api/links/check');
            expect(req.request.headers.get('X-Requested-With')).toBe(
                'XMLHttpRequest'
            );
            req.flush({ link1: { isExist: true } });
        });

        it('should map response to Record<string, boolean>', () => {
            let result: Record<string, boolean> | undefined;
            spectator.service.checkLinks(['link1', 'link2']).subscribe(r => {
                result = r;
            });

            httpController.expectOne('/api/links/check').flush({
                link1: { isExist: true },
                link2: { isExist: false },
            });

            expect(result).toEqual({ link1: true, link2: false });
        });

        it('should handle empty response', () => {
            let result: Record<string, boolean> | undefined;
            spectator.service.checkLinks(['link1']).subscribe(r => {
                result = r;
            });

            httpController.expectOne('/api/links/check').flush({});

            expect(result).toEqual({});
        });
    });
});
