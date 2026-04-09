import { ChangeDetectionStrategy, Component, OnDestroy, inject, input, output, effect } from '@angular/core';
import { SidebarService } from '@drevo-web/core';
import { SidebarAction, SidebarActionPriority } from '@drevo-web/shared';

let nextId = 0;

@Component({
    selector: 'app-sidebar-action',
    template: '',
    host: {
        '[style.display]': '"none"',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarActionComponent implements OnDestroy {
    private readonly sidebarService = inject(SidebarService);
    private readonly actionId = `sidebar-action-${nextId++}`;

    readonly icon = input.required<string>();
    readonly svgIcon = input<string>();
    readonly label = input.required<string>();
    readonly priority = input<SidebarActionPriority>('secondary');
    readonly link = input<string>();
    readonly order = input<number>();
    readonly disabled = input<boolean>();
    readonly badge = input<number>();
    readonly testId = input<string>();

    readonly activated = output<void>();

    constructor() {
        effect(() => {
            const link = this.link();
            const action: SidebarAction = {
                id: this.actionId,
                icon: this.icon(),
                svgIcon: this.svgIcon(),
                label: this.label(),
                priority: this.priority(),
                order: this.order(),
                link,
                disabled: this.disabled(),
                badge: this.badge(),
                testId: this.testId(),
                action: link ? undefined : () => this.activated.emit(),
            };

            this.sidebarService.registerAction(action);
        });
    }

    ngOnDestroy(): void {
        this.sidebarService.unregisterAction(this.actionId);
    }
}
