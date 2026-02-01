import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { MatMenu } from '@angular/material/menu';

@Component({
    selector: 'ui-dropdown-menu',
    imports: [MatMenu],
    templateUrl: './dropdown-menu.component.html',
    styleUrl: './dropdown-menu.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuComponent {
    readonly menu = viewChild.required<MatMenu>('menu');
}
