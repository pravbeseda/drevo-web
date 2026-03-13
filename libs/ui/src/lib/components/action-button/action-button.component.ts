import { BadgeComponent } from '../badge/badge.component';
import { NgTemplateOutlet } from '@angular/common';
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
    imports: [NgTemplateOutlet, RouterLink, MatFabButton, MatMiniFabButton, MatIcon, MatTooltip, BadgeComponent],
    templateUrl: './action-button.component.html',
    styleUrl: './action-button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonComponent {
    readonly icon = input.required<string>();
    readonly svgIcon = input<string>();
    readonly label = input.required<string>();
    readonly priority = input<SidebarActionPriority>('secondary');
    readonly variant = input<ActionButtonVariant>('default');
    readonly size = input<ActionButtonSize>('default');
    readonly showTooltip = input<boolean>(true);
    readonly link = input<string>();
    readonly disabled = input<boolean>();
    readonly badge = input<number>();

    readonly clicked = output<void>();

    protected onClick(): void {
        this.clicked.emit();
    }
}
