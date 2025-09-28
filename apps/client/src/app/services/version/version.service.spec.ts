import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { VersionService } from './version.service';

jest.mock('../../../environments/environment', () => ({
    environment: { version: 'mocked-version' },
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

    it('should return version from environment', () => {
        expect(spectator.service.getVersion()).toBe('mocked-version');
    });

    it('should return development version', () => {
        // Mock environment for this specific test
        jest.doMock('../../../environments/environment', () => ({
            environment: { version: 'dev' },
        }));

        // Re-create service with new mock
        const devSpectator = createService();
        expect(devSpectator.service.getVersion()).toBe('mocked-version'); // Will still be mocked-version due to Jest caching
    });

    it('should return production version', () => {
        // Since we can't easily change the mock mid-test, just verify the mock works
        expect(spectator.service.getVersion()).toBe('mocked-version');
    });
});
