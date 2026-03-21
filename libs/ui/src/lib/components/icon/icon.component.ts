import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TooltipPosition, MatTooltip } from '@angular/material/tooltip';

export type IconSize = 'small' | 'medium' | 'large' | 'xlarge';

@Component({
    selector: 'ui-icon',
    imports: [MatIcon, MatTooltip],
    templateUrl: './icon.component.html',
    styleUrl: './icon.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
    readonly name = input<string>();
    readonly svgIcon = input<string>();
    readonly size = input<IconSize>('medium');
    readonly tooltip = input<string>();
    readonly tooltipPosition = input<TooltipPosition>('below');
}
