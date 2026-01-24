import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

export type IconSize = 'small' | 'medium' | 'large' | 'xlarge';

@Component({
    selector: 'ui-icon',
    imports: [MatIcon],
    template: `<mat-icon [class]="size()">{{ name() }}</mat-icon>`,
    styleUrl: './icon.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
    name = input.required<string>();
    size = input<IconSize>('medium');
}
