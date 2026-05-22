import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { SidebarService } from '@drevo-web/core';

let nextId = 0;

/**
 * Reserves the right sidebar slot for the current page even when there are no sidebar actions.
 * Prevents main-column reflow when navigating between tabs where some have actions and some don't.
 * Drop the component into a page template the same way `<app-sidebar-action>` is used.
 */
@Component({
    selector: 'app-sidebar-reserve',
    template: '',
    host: {
        '[style.display]': '"none"',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarReserveComponent {
    private readonly sidebarService = inject(SidebarService);
    private readonly reservationId = `sidebar-reserve-${nextId++}`;

    constructor() {
        this.sidebarService.addReservation(this.reservationId);
        inject(DestroyRef).onDestroy(() => this.sidebarService.removeReservation(this.reservationId));
    }
}
