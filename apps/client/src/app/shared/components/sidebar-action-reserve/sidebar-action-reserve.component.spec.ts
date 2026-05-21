import { SidebarActionReserveComponent } from './sidebar-action-reserve.component';
import { SidebarService } from '@drevo-web/core';
import { Spectator, SpyObject, createComponentFactory } from '@ngneat/spectator/jest';

describe('SidebarActionReserveComponent', () => {
    let spectator: Spectator<SidebarActionReserveComponent>;
    let sidebarService: SpyObject<SidebarService>;

    const createComponent = createComponentFactory({
        component: SidebarActionReserveComponent,
        mocks: [SidebarService],
    });

    beforeEach(() => {
        spectator = createComponent();
        sidebarService = spectator.inject(SidebarService);
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should hide the host element', () => {
        expect(spectator.element).toHaveStyle({ display: 'none' });
    });

    it('should add a reservation with a unique id on init', () => {
        expect(sidebarService.addReservation).toHaveBeenCalledTimes(1);
        const reservationId = sidebarService.addReservation.mock.calls[0][0];
        expect(reservationId).toMatch(/^sidebar-reserve-\d+$/);
    });

    it('should remove the same reservation on destroy', () => {
        const reservationId = sidebarService.addReservation.mock.calls[0][0];

        spectator.fixture.destroy();

        expect(sidebarService.removeReservation).toHaveBeenCalledWith(reservationId);
    });

    it('should generate unique ids across instances', () => {
        const firstId = sidebarService.addReservation.mock.calls[0][0];

        const secondSpectator = createComponent();
        const secondService = secondSpectator.inject(SidebarService);
        const secondId = secondService.addReservation.mock.calls[0][0];

        expect(secondId).not.toBe(firstId);
    });
});
