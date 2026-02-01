import { IconComponent } from '../icon/icon.component';
import { CdkMenuItem } from '@angular/cdk/menu';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    inject,
    input,
    output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'ui-dropdown-menu-item',
    imports: [IconComponent],
    hostDirectives: [CdkMenuItem],
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
    readonly disabled = input(false);
    readonly clicked = output<void>();

    constructor() {
        effect(() => {
            this.cdkMenuItem.disabled = this.disabled();
        });

        this.cdkMenuItem.triggered
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.clicked.emit());
    }
}
