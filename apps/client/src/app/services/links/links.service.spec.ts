import { HttpClient } from '@angular/common/http';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { IframeService } from '../iframe/iframe.service';
import { LinksService } from './links.service';

describe('LinksStateService', () => {
    let spectator: SpectatorService<LinksService>;
    const createService = createServiceFactory({
        service: LinksService,
        mocks: [IframeService, HttpClient],
    });

    beforeEach(() => (spectator = createService()));

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });
});
