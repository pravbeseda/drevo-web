import { Component, viewChild } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { MatMenuTrigger } from '@angular/material/menu';
import { DropdownMenuComponent } from './dropdown-menu.component';
import { DropdownMenuTriggerDirective } from './dropdown-menu-trigger.directive';

@Component({
    selector: 'ui-test-host',
    imports: [DropdownMenuComponent, DropdownMenuTriggerDirective],
    template: `
        <button [uiDropdownMenuTriggerFor]="menu.menu()">Open</button>
        <ui-dropdown-menu #menu>
            <div class="test-content">Content</div>
        </ui-dropdown-menu>
    `,
})
class TestHostComponent {
    readonly menuRef = viewChild.required<DropdownMenuComponent>('menu');
}

describe('DropdownMenuTriggerDirective', () => {
    let spectator: Spectator<TestHostComponent>;
    const createComponent = createComponentFactory({
        component: TestHostComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should apply MatMenuTrigger to the host element', () => {
        const button = spectator.query('button');
        expect(button).toBeTruthy();

        const trigger = spectator.query(MatMenuTrigger);
        expect(trigger).toBeTruthy();
    });
});
