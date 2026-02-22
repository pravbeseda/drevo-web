import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { SidebarService } from '@drevo-web/core';
import { SidebarAction } from '@drevo-web/shared';
import { ActionButtonComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-right-sidebar',
    imports: [ActionButtonComponent],
    templateUrl: './right-sidebar.component.html',
    styleUrl: './right-sidebar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RightSidebarComponent {
    private readonly sidebarService = inject(SidebarService);

    readonly actions = this.sidebarService.actions;
    readonly primaryActions = this.sidebarService.primaryActions;
    readonly secondaryActions = this.sidebarService.secondaryActions;
    readonly menuOpen = signal(false);

    toggleMenu(): void {
        this.menuOpen.update(open => !open);
    }

    handleSpeedDialAction(action: SidebarAction): void {
        action.action?.();
        this.menuOpen.set(false);
    }
}
