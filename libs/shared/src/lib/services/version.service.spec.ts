import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { VersionService, VERSION_CONFIG } from './version.service';

describe('VersionService', () => {
  let spectator: SpectatorService<VersionService>;

  const createService = createServiceFactory({
    service: VersionService,
    providers: [
      {
        provide: VERSION_CONFIG,
        useValue: { version: '' }
      }
    ]
  });

  const setupService = (version: string) => {
    spectator = createService();
    const config = spectator.inject(VERSION_CONFIG);
    config.version = version;
  };

  it('should be created', () => {
    setupService('test-version');
    expect(spectator.service).toBeTruthy();
  });

  it('should return version from config', () => {
    setupService('1.2.3');
    expect(spectator.service.getVersion()).toBe('1.2.3');
  });

  it('should return development version', () => {
    setupService('dev');
    expect(spectator.service.getVersion()).toBe('dev');
  });

  it('should return production version', () => {
    setupService('2.0.1');
    expect(spectator.service.getVersion()).toBe('2.0.1');
  });
});