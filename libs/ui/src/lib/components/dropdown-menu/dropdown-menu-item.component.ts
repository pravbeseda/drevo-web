import { IconComponent } from '../icon/icon.component';
import { CdkMenuItem } from '@angular/cdk/menu';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    input,
    output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'ui-dropdown-menu-item',
    imports: [IconComponent],
    hostDirectives: [
        {
            directive: CdkMenuItem,
            inputs: ['cdkMenuItemDisabled: disabled'],
        },
    ],
    template: `
        @if (icon()) {
            <ui-icon
                [name]="icon()!"
                size="small" />
        }
        <ng-content />
    `,
    styleUrl: './dropdown-menu-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuItemComponent {
    private readonly cdkMenuItem = inject(CdkMenuItem);
    private readonly destroyRef = inject(DestroyRef);

    readonly icon = input<string>();
    readonly clicked = output<void>();

    constructor() {
        this.cdkMenuItem.triggered
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.clicked.emit());
    }
}
