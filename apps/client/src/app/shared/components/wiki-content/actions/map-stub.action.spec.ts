import { MapStubAction } from './map-stub.action';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { NotificationService } from '@drevo-web/core';

describe('MapStubAction', () => {
    let spectator: SpectatorService<MapStubAction>;

    const createService = createServiceFactory({
        service: MapStubAction,
        mocks: [NotificationService],
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('should have name', () => {
        expect(spectator.service.name).toBe('MapStub');
    });

    describe('canExecute', () => {
        it('should match toggleYandexMap', () => {
            expect(spectator.service.canExecute('toggleYandexMap')).toBe(true);
        });

        it('should match googleMap', () => {
            expect(spectator.service.canExecute('googleMap')).toBe(true);
        });

        it('should not match other actions', () => {
            expect(spectator.service.canExecute('toggleAll')).toBe(false);
        });
    });

    describe('execute', () => {
        it('should show not-implemented notification', () => {
            const notification = spectator.inject(NotificationService);

            spectator.service.execute('toggleYandexMap', document.createElement('div'));

            expect(notification.info).toHaveBeenCalledWith('Функция еще не реализована');
        });
    });
});
