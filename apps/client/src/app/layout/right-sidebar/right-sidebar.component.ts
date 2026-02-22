import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
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
    readonly menuOpen = signal(false);

    readonly mainAction = computed<SidebarAction | undefined>(() => {
        const all = this.actions();
        return all.find(a => a.priority === 'primary') ?? all[0];
    });

    readonly menuActions = computed(() => {
        const main = this.mainAction();
        return main ? this.actions().filter(a => a.id !== main.id) : [];
    });

    toggleMenu(): void {
        this.menuOpen.update(open => !open);
    }

    handleSpeedDialAction(action: SidebarAction): void {
        action.action?.();
        this.menuOpen.set(false);
    }
}
