import { CdkMenu } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'ui-dropdown-menu',
    hostDirectives: [CdkMenu],
    template: `
        <ng-content />
    `,
    styleUrl: './dropdown-menu.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuComponent {}
