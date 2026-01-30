import { HttpClient } from '@angular/common/http';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LinksApiService } from './links-api.service';

describe('LinksApiService', () => {
    let spectator: SpectatorService<LinksApiService>;
    const createService = createServiceFactory({
        service: LinksApiService,
        mocks: [HttpClient],
    });

    beforeEach(() => (spectator = createService()));

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });
});
