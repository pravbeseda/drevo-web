import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFabButton, MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { SidebarActionPriority } from '@drevo-web/shared';

export type ActionButtonVariant = 'default' | 'main' | 'menu' | 'speed-dial';
export type ActionButtonSize = 'default' | 'mini';

@Component({
    selector: 'ui-action-button',
    imports: [RouterLink, MatFabButton, MatMiniFabButton, MatIcon, MatTooltip],
    templateUrl: './action-button.component.html',
    styleUrl: './action-button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonComponent {
    icon = input.required<string>();
    svgIcon = input<string>();
    label = input.required<string>();
    priority = input<SidebarActionPriority>('secondary');
    variant = input<ActionButtonVariant>('default');
    size = input<ActionButtonSize>('default');
    showTooltip = input<boolean>(true);
    showLabel = input<boolean>(false);
    link = input<string>();
    disabled = input<boolean>();

    clicked = output<void>();

    protected onClick(): void {
        this.clicked.emit();
    }
}
