import { createServiceFactory, mockProvider, SpectatorService } from '@ngneat/spectator/jest';
import { StorageService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { AI_KEY_STORAGE_KEY, AiKeyService } from './ai-key.service';

describe('AiKeyService', () => {
    let spectator: SpectatorService<AiKeyService>;
    let storage: jest.Mocked<StorageService>;

    const createService = createServiceFactory({
        service: AiKeyService,
        providers: [mockLoggerProvider()],
    });

    const create = (stored: string | undefined): void => {
        spectator = createService({
            providers: [mockProvider(StorageService, { getString: jest.fn().mockReturnValue(stored) })],
        });
        storage = spectator.inject(StorageService);
    };

    it('should read the stored key', () => {
        create('sk-or-stored');

        expect(spectator.service.key()).toBe('sk-or-stored');
        expect(storage.getString).toHaveBeenCalledWith(AI_KEY_STORAGE_KEY);
    });

    it('should have no key when none is stored', () => {
        create(undefined);

        expect(spectator.service.key()).toBeUndefined();
    });

    it('should save a trimmed key', () => {
        create(undefined);

        spectator.service.save('  sk-or-new \n');

        expect(storage.setString).toHaveBeenCalledWith(AI_KEY_STORAGE_KEY, 'sk-or-new');
        expect(spectator.service.key()).toBe('sk-or-new');
    });

    it('should ignore a blank key', () => {
        create(undefined);

        spectator.service.save('   ');

        expect(storage.setString).not.toHaveBeenCalled();
        expect(spectator.service.key()).toBeUndefined();
    });

    it('should remove the key', () => {
        create('sk-or-stored');

        spectator.service.remove();

        expect(storage.remove).toHaveBeenCalledWith(AI_KEY_STORAGE_KEY);
        expect(spectator.service.key()).toBeUndefined();
    });
});
