import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TooltipPosition, MatTooltip } from '@angular/material/tooltip';

export type IconSize = 'small' | 'medium' | 'large' | 'xlarge';

export type IconTone = 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'secondary' | 'accent';

@Component({
    selector: 'ui-icon',
    imports: [MatIcon, MatTooltip],
    templateUrl: './icon.component.html',
    styleUrl: './icon.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'toneClass()',
        '[class.filled]': 'filled()',
    },
})
export class IconComponent {
    readonly name = input<string>();
    readonly svgIcon = input<string>();
    readonly fontSet = input<string>();
    readonly size = input<IconSize>('medium');
    readonly tooltip = input<string>();
    readonly tooltipPosition = input<TooltipPosition>('below');
    // Optional color tone; undefined keeps the ambient `color` (inherited).
    readonly tone = input<IconTone>();
    // When true, `tone` fills a circular background and the glyph turns white.
    readonly filled = input(false, { transform: booleanAttribute });

    protected readonly toneClass = computed(() => {
        const tone = this.tone();
        return tone ? `tone-${tone}` : '';
    });
}
