import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { DrawerService } from './drawer.service';

describe('DrawerService', () => {
    let spectator: SpectatorService<DrawerService>;

    const createService = createServiceFactory({
        service: DrawerService,
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should start with drawer open', () => {
        expect(spectator.service.isOpen()).toBe(true);
    });

    describe('toggle()', () => {
        it('should close when open', () => {
            spectator.service.toggle();

            expect(spectator.service.isOpen()).toBe(false);
        });

        it('should open when closed', () => {
            spectator.service.close();

            spectator.service.toggle();

            expect(spectator.service.isOpen()).toBe(true);
        });
    });

    describe('open()', () => {
        it('should set isOpen to true', () => {
            spectator.service.close();

            spectator.service.open();

            expect(spectator.service.isOpen()).toBe(true);
        });

        it('should remain open when already open', () => {
            spectator.service.open();

            expect(spectator.service.isOpen()).toBe(true);
        });
    });

    describe('close()', () => {
        it('should set isOpen to false', () => {
            spectator.service.close();

            expect(spectator.service.isOpen()).toBe(false);
        });

        it('should remain closed when already closed', () => {
            spectator.service.close();
            spectator.service.close();

            expect(spectator.service.isOpen()).toBe(false);
        });
    });
});
