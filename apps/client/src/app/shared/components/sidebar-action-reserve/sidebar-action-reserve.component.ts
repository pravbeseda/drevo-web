import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { SidebarService } from '@drevo-web/core';

let nextId = 0;

/**
 * Reserves the right sidebar slot for the current page even when there are no sidebar actions.
 * Prevents main-column reflow when navigating between tabs where some have actions and some don't.
 * Drop the component into a page template the same way `<app-sidebar-action>` is used.
 */
@Component({
    selector: 'app-sidebar-action-reserve',
    template: '',
    host: {
        '[style.display]': '"none"',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarActionReserveComponent implements OnInit, OnDestroy {
    private readonly sidebarService = inject(SidebarService);
    private readonly reservationId = `sidebar-reserve-${nextId++}`;

    ngOnInit(): void {
        this.sidebarService.addReservation(this.reservationId);
    }

    ngOnDestroy(): void {
        this.sidebarService.removeReservation(this.reservationId);
    }
}
