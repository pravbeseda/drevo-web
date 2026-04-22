import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { VersionService } from './version.service';

jest.mock('../../shared/build-info', () => ({
    BUILD_INFO: { version: 'mocked-version' },
}));

describe('VersionService', () => {
    let spectator: SpectatorService<VersionService>;

    const createService = createServiceFactory({
        service: VersionService,
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should return version from build info', () => {
        expect(spectator.service.getVersion()).toBe('mocked-version');
    });
});
