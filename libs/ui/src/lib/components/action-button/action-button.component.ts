import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { SidebarActionPriority } from '@drevo-web/shared';

export type ActionButtonVariant = 'default' | 'main' | 'menu' | 'speed-dial';

@Component({
    selector: 'ui-action-button',
    templateUrl: './action-button.component.html',
    styleUrl: './action-button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonComponent {
    icon = input.required<string>();
    label = input.required<string>();
    priority = input<SidebarActionPriority>('secondary');
    variant = input<ActionButtonVariant>('default');
    showTooltip = input<boolean>(true);
    showLabel = input<boolean>(false);

    clicked = output<void>();

    protected onClick(): void {
        this.clicked.emit();
    }
}
