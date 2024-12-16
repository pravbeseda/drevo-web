import { createServiceFactory, SpectatorService } from '@ngneat/spectator';
import { LinksStateService } from './links-state.service';

describe('LinksStateService', () => {
    let spectator: SpectatorService<LinksStateService>;
    const createService = createServiceFactory(LinksStateService);

    beforeEach(() => (spectator = createService()));

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });
});
