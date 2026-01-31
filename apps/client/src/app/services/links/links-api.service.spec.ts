import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LinksApiService } from './links-api.service';

const CHECK_URL = '/api/wiki-links/check';

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
        it('should send POST request to /api/wiki-links/check', () => {
            spectator.service.checkLinks(['link1']).subscribe();

            const req = httpController.expectOne(CHECK_URL);
            expect(req.request.method).toBe('POST');
            req.flush({ success: true, data: { link1: { isExist: true } } });
        });

        it('should send links as JSON body', () => {
            spectator.service.checkLinks(['link1', 'link2']).subscribe();

            const req = httpController.expectOne(CHECK_URL);
            expect(req.request.body).toEqual({ links: ['link1', 'link2'] });
            req.flush({
                success: true,
                data: {
                    link1: { isExist: true },
                    link2: { isExist: false },
                },
            });
        });

        it('should send request with credentials', () => {
            spectator.service.checkLinks(['link1']).subscribe();

            const req = httpController.expectOne(CHECK_URL);
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: { link1: { isExist: true } } });
        });

        it('should map response to Record<string, boolean>', () => {
            let result: Record<string, boolean> | undefined;
            spectator.service.checkLinks(['link1', 'link2']).subscribe(r => {
                result = r;
            });

            httpController.expectOne(CHECK_URL).flush({
                success: true,
                data: {
                    link1: { isExist: true },
                    link2: { isExist: false },
                },
            });

            expect(result).toEqual({ link1: true, link2: false });
        });

        it('should handle empty response data', () => {
            let result: Record<string, boolean> | undefined;
            spectator.service.checkLinks(['link1']).subscribe(r => {
                result = r;
            });

            httpController.expectOne(CHECK_URL).flush({
                success: true,
                data: {},
            });

            expect(result).toEqual({});
        });

        it('should throw when response.data is undefined', done => {
            spectator.service.checkLinks(['link1']).subscribe({
                error: (err: Error) => {
                    expect(err.message).toContain('Response data is undefined');
                    done();
                },
            });

            httpController
                .expectOne(CHECK_URL)
                .flush({ success: true, data: undefined });
        });
    });
});
