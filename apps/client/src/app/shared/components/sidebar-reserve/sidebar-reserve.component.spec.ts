import { SidebarReserveComponent } from './sidebar-reserve.component';
import { SidebarService } from '@drevo-web/core';
import { Spectator, SpyObject, createComponentFactory } from '@ngneat/spectator/jest';

describe('SidebarReserveComponent', () => {
    let spectator: Spectator<SidebarReserveComponent>;
    let sidebarService: SpyObject<SidebarService>;

    const createComponent = createComponentFactory({
        component: SidebarReserveComponent,
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
});
