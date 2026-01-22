import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '@drevo-web/core';
import { SidebarAction } from '@drevo-web/shared';

@Component({
    selector: 'ui-right-sidebar',
    imports: [CommonModule],
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
        action.action();
        this.menuOpen.set(false);
    }
}
