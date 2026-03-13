import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'ui-badge',
    templateUrl: './badge.component.html',
    styleUrl: './badge.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
    readonly value = input<number | string>();
}
