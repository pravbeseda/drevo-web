import {
    Directive,
    OnInit,
    OnDestroy,
    inject,
    ElementRef,
    input,
    effect,
} from '@angular/core';
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
export class SidebarActionDirective implements OnInit, OnDestroy {
    private readonly sidebarService = inject(SidebarService);
    private readonly elementRef = inject(ElementRef);
    private readonly actionId = `sidebar-action-${nextId++}`;

    readonly icon = input.required<string>();
    readonly priority = input<SidebarActionPriority>('secondary');
    readonly href = input<string>();
    readonly disabled = input<boolean>();

    private label = '';
    private initialized = false;

    constructor() {
        effect(() => {
            if (this.initialized) {
                this.registerAction(this.disabled());
            }
        });
    }

    ngOnInit(): void {
        this.label = this.elementRef.nativeElement.textContent?.trim() || '';
        this.registerAction(this.disabled());
        this.initialized = true;
    }

    ngOnDestroy(): void {
        this.sidebarService.unregisterAction(this.actionId);
    }

    private registerAction(disabled: boolean | undefined): void {
        const href = this.href();
        const action: SidebarAction = {
            id: this.actionId,
            icon: this.icon(),
            label: this.label,
            priority: this.priority(),
            href,
            disabled,
            action: href ? undefined : () => this.triggerClick(),
        };

        this.sidebarService.registerAction(action);
    }

    private triggerClick(): void {
        const element = this.elementRef.nativeElement as HTMLElement;
        element.click();
    }
}
