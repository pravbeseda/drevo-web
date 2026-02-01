import { Component } from '@angular/core';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import { DropdownMenuComponent } from './dropdown-menu.component';
import { DropdownMenuTriggerDirective } from './dropdown-menu-trigger.directive';

@Component({
    selector: 'ui-test-host',
    imports: [DropdownMenuComponent, DropdownMenuTriggerDirective],
    template: `
        <button [uiDropdownMenuTriggerFor]="menuContent">Open</button>
        <ng-template #menuContent>
            <ui-dropdown-menu>
                <div class="test-content">Content</div>
            </ui-dropdown-menu>
        </ng-template>
    `,
})
class TestHostComponent {}

describe('DropdownMenuTriggerDirective', () => {
    let spectator: Spectator<TestHostComponent>;
    const createComponent = createComponentFactory({
        component: TestHostComponent,
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should apply CdkMenuTrigger to the host element', () => {
        const trigger = spectator.query(CdkMenuTrigger);
        expect(trigger).toBeTruthy();
    });
});
