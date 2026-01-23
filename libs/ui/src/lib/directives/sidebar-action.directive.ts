import {
    Directive,
    Input,
    OnInit,
    OnDestroy,
    inject,
    ElementRef,
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

    @Input({ required: true }) icon!: string;
    @Input({ required: true }) label!: string;
    @Input() priority: SidebarActionPriority = 'secondary';

    ngOnInit(): void {
        const action: SidebarAction = {
            id: this.actionId,
            icon: this.icon,
            label: this.label,
            priority: this.priority,
            action: () => this.triggerClick(),
        };

        this.sidebarService.registerAction(action);
    }

    ngOnDestroy(): void {
        this.sidebarService.unregisterAction(this.actionId);
    }

    private triggerClick(): void {
        const element = this.elementRef.nativeElement as HTMLElement;
        element.click();
    }
}
