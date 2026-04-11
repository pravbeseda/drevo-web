import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { LinksApiService } from './links-api.service';
import { LinksService } from './links.service';

describe('LinksService', () => {
    let spectator: SpectatorService<LinksService>;
    let linksApiService: jest.Mocked<LinksApiService>;

    const createService = createServiceFactory({
        service: LinksService,
        mocks: [LinksApiService],
    });

    beforeEach(() => {
        spectator = createService();
        linksApiService = spectator.inject(LinksApiService) as jest.Mocked<LinksApiService>;
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    describe('getLinkStatuses', () => {
        it('should return empty object for empty links array', () => {
            let result: Record<string, boolean> | undefined;
            spectator.service.getLinkStatuses([]).subscribe(r => {
                result = r;
            });

            expect(result).toEqual({});
            expect(linksApiService.checkLinks).not.toHaveBeenCalled();
        });

        it('should delegate to LinksApiService for non-empty links', () => {
            const mockResult = { link1: true, link2: false };
            linksApiService.checkLinks.mockReturnValue(of(mockResult));

            let result: Record<string, boolean> | undefined;
            spectator.service.getLinkStatuses(['link1', 'link2']).subscribe(r => {
                result = r;
            });

            expect(linksApiService.checkLinks).toHaveBeenCalledWith(['link1', 'link2']);
            expect(result).toEqual(mockResult);
        });

        it('should call checkLinks once when links count does not exceed 500', () => {
            const links = Array.from({ length: 500 }, (_, i) => `link${i}`);
            linksApiService.checkLinks.mockReturnValue(of({}));

            spectator.service.getLinkStatuses(links).subscribe();

            expect(linksApiService.checkLinks).toHaveBeenCalledTimes(1);
            expect(linksApiService.checkLinks).toHaveBeenCalledWith(links);
        });

        it('should split links into batches of 500 when array exceeds limit', () => {
            const links = Array.from({ length: 501 }, (_, i) => `link${i}`);
            linksApiService.checkLinks.mockReturnValue(of({}));

            spectator.service.getLinkStatuses(links).subscribe();

            expect(linksApiService.checkLinks).toHaveBeenCalledTimes(2);
            expect(linksApiService.checkLinks).toHaveBeenNthCalledWith(1, links.slice(0, 500));
            expect(linksApiService.checkLinks).toHaveBeenNthCalledWith(2, links.slice(500));
        });

        it('should merge results from all batches', () => {
            const links = Array.from({ length: 501 }, (_, i) => `link${i}`);
            const batch1Result = Object.fromEntries(links.slice(0, 500).map(l => [l, true]));
            const batch2Result = { 'extra-link': false };

            linksApiService.checkLinks
                .mockReturnValueOnce(of(batch1Result))
                .mockReturnValueOnce(of(batch2Result));

            let result: Record<string, boolean> | undefined;
            spectator.service.getLinkStatuses(links).subscribe(r => {
                result = r;
            });

            expect(result).toEqual({ ...batch1Result, ...batch2Result });
        });
    });
});
