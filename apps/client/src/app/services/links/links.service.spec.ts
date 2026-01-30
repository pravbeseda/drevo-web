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
        linksApiService = spectator.inject(
            LinksApiService
        ) as jest.Mocked<LinksApiService>;
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
            spectator.service
                .getLinkStatuses(['link1', 'link2'])
                .subscribe(r => {
                    result = r;
                });

            expect(linksApiService.checkLinks).toHaveBeenCalledWith([
                'link1',
                'link2',
            ]);
            expect(result).toEqual(mockResult);
        });
    });
});
