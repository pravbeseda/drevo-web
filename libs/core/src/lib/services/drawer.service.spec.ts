import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { DrawerService } from './drawer.service';
import { StorageService } from './storage.service';

describe('DrawerService', () => {
    let spectator: SpectatorService<DrawerService>;
    let storage: jest.Mocked<StorageService>;

    const createService = createServiceFactory({
        service: DrawerService,
        mocks: [StorageService],
    });

    beforeEach(() => {
        spectator = createService();
        storage = spectator.inject(StorageService) as jest.Mocked<StorageService>;
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should start with drawer closed', () => {
        expect(spectator.service.isOpen()).toBe(false);
    });

    describe('toggle()', () => {
        it('should open when closed', () => {
            spectator.service.toggle();

            expect(spectator.service.isOpen()).toBe(true);
        });

        it('should close when open', () => {
            spectator.service.open();

            spectator.service.toggle();

            expect(spectator.service.isOpen()).toBe(false);
        });

        it('should save state to storage', () => {
            spectator.service.toggle();

            expect(storage.set).toHaveBeenCalledWith(
                'drevo-sidebar-open',
                true
            );
        });

        it('should save false when toggling from open to closed', () => {
            spectator.service.open();
            storage.set.mockClear();

            spectator.service.toggle();

            expect(storage.set).toHaveBeenCalledWith(
                'drevo-sidebar-open',
                false
            );
        });
    });

    describe('open()', () => {
        it('should set isOpen to true', () => {
            spectator.service.close();

            spectator.service.open();

            expect(spectator.service.isOpen()).toBe(true);
        });

        it('should not save to storage', () => {
            spectator.service.open();

            expect(storage.set).not.toHaveBeenCalled();
        });
    });

    describe('close()', () => {
        it('should set isOpen to false', () => {
            spectator.service.close();

            expect(spectator.service.isOpen()).toBe(false);
        });

        it('should not save to storage', () => {
            spectator.service.close();

            expect(storage.set).not.toHaveBeenCalled();
        });
    });

    describe('restoreSaved()', () => {
        it('should restore saved open state', () => {
            storage.get.mockReturnValue(true);

            spectator.service.restoreSaved();

            expect(spectator.service.isOpen()).toBe(true);
        });

        it('should restore saved closed state', () => {
            storage.get.mockReturnValue(false);

            spectator.service.restoreSaved();

            expect(spectator.service.isOpen()).toBe(false);
        });

        it('should default to open when no saved state', () => {
            storage.get.mockReturnValue(undefined);

            spectator.service.restoreSaved();

            expect(spectator.service.isOpen()).toBe(true);
        });
    });
});
