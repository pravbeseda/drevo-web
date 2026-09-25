import { avatarBackground } from './avatar-color';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md';

const INITIALS_COUNT = 2;

@Component({
    selector: 'ui-avatar',
    templateUrl: './avatar.component.html',
    styleUrl: './avatar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: 'img',
        '[attr.aria-label]': 'name()',
        '[class.ui-avatar--sm]': 'size() === "sm"',
        '[style.background-color]': 'background()',
    },
})
export class AvatarComponent {
    readonly name = input.required<string>();
    readonly size = input<AvatarSize>('md');

    protected readonly initials = computed(() =>
        (this.name().match(/[\p{L}\p{N}]+/gu) ?? [])
            .slice(0, INITIALS_COUNT)
            .map(word => word.charAt(0).toLocaleUpperCase('ru-RU'))
            .join(''),
    );

    protected readonly background = computed(() => avatarBackground(this.name()));
}
