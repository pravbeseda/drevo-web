import { Directive, OnDestroy, inject, ElementRef, input, effect } from '@angular/core';
import { SidebarService } from '@drevo-web/core';
import { SidebarAction, SidebarActionPriority } from '@drevo-web/shared';

let nextId = 0;

@Directive({
    // eslint-disable-next-line @angular-eslint/directive-selector
    selector: '[sidebarAction]',
    standalone: true,
    host: {
        '[style.display]': '"none"',
    },
})
export class SidebarActionDirective implements OnDestroy {
    private readonly sidebarService = inject(SidebarService);
    private readonly elementRef = inject(ElementRef);
    private readonly actionId = `sidebar-action-${nextId++}`;

    readonly icon = input.required<string>();
    readonly label = input.required<string>();
    readonly priority = input<SidebarActionPriority>('secondary');
    readonly link = input<string>();
    readonly disabled = input<boolean>();

    constructor() {
        effect(() => {
            const link = this.link();
            const action: SidebarAction = {
                id: this.actionId,
                icon: this.icon(),
                label: this.label(),
                priority: this.priority(),
                link,
                disabled: this.disabled(),
                action: link ? undefined : () => this.triggerClick(),
            };

            this.sidebarService.registerAction(action);
        });
    }

    ngOnDestroy(): void {
        this.sidebarService.unregisterAction(this.actionId);
    }

    private triggerClick(): void {
        const element = this.elementRef.nativeElement as HTMLElement;
        element.click();
    }
}
