import { BackLinkService } from './back-link.service';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

describe('BackLinkService', () => {
    let spectator: SpectatorService<BackLinkService>;
    const createService = createServiceFactory(BackLinkService);

    beforeEach(() => {
        spectator = createService();
    });

    it('offers no way back by default', () => {
        expect(spectator.service.link()).toBeUndefined();
    });

    it('offers the link a page shows', () => {
        spectator.service.show('/forum/common');

        expect(spectator.service.link()).toBe('/forum/common');
    });

    it('drops the link its owner hides', () => {
        spectator.service.show('/forum/common');
        spectator.service.hide('/forum/common');

        expect(spectator.service.link()).toBeUndefined();
    });

    it('keeps a link another page has shown since', () => {
        spectator.service.show('/forum');
        spectator.service.show('/articles/7/forum');
        spectator.service.hide('/forum');

        expect(spectator.service.link()).toBe('/articles/7/forum');
    });
});
