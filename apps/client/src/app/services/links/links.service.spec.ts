import { createServiceFactory, SpectatorService } from '@ngneat/spectator';
import { LinksService } from './links.service';

describe('LinksStateService', () => {
    let spectator: SpectatorService<LinksService>;
    const createService = createServiceFactory(LinksService);

    beforeEach(() => (spectator = createService()));

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });
});
