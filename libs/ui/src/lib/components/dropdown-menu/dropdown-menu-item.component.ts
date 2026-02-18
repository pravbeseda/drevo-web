import { IconComponent } from '../icon/icon.component';
import { CdkMenuItem } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
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
        @if (icon() !== undefined) {
            <span class="icon-slot">
                @if (icon()) {
                    <ui-icon
                        [name]="icon()!"
                        size="small"
                    />
                }
            </span>
        }
        <ng-content />
    `,
    styleUrl: './dropdown-menu-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuItemComponent {
    private readonly cdkMenuItem = inject(CdkMenuItem);

    readonly icon = input<string>();
    readonly clicked = output<void>();

    constructor() {
        this.cdkMenuItem.triggered.pipe(takeUntilDestroyed()).subscribe(() => this.clicked.emit());
    }
}
