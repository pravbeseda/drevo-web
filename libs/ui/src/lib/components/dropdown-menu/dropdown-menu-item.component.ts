import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenuItem } from '@angular/material/menu';

@Component({
    selector: 'ui-dropdown-menu-item',
    imports: [MatMenuItem, MatIcon],
    templateUrl: './dropdown-menu-item.component.html',
    styleUrl: './dropdown-menu-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuItemComponent {
    icon = input<string>();
    disabled = input<boolean>(false);

    clicked = output<void>();

    onClick(): void {
        this.clicked.emit();
    }
}
