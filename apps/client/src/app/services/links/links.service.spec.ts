import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LinksService } from './links.service';
import { IframeService } from '../iframe/iframe.service';

describe('LinksStateService', () => {
    let spectator: SpectatorService<LinksService>;
    const createService = createServiceFactory({
        service: LinksService,
        mocks: [IframeService],
    });

    beforeEach(() => (spectator = createService()));

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });
});
