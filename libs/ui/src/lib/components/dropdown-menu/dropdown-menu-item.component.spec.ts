import { Component } from '@angular/core';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { CdkMenuItem } from '@angular/cdk/menu';
import { DropdownMenuComponent } from './dropdown-menu.component';
import { DropdownMenuItemComponent } from './dropdown-menu-item.component';

@Component({
    selector: 'ui-test-host',
    imports: [DropdownMenuComponent, DropdownMenuItemComponent],
    template: `
        <ui-dropdown-menu>
            <ui-dropdown-menu-item
                #item
                [icon]="icon"
                [disabled]="disabled">
                Test Label
            </ui-dropdown-menu-item>
        </ui-dropdown-menu>
    `,
})
class TestHostComponent {
    icon?: string;
    disabled = false;
}

describe('DropdownMenuItemComponent', () => {
    let spectator: Spectator<TestHostComponent>;
    const createComponent = createComponentFactory({
        component: TestHostComponent,
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        const item = spectator.query(DropdownMenuItemComponent);
        expect(item).toBeTruthy();
    });

    it('should have CdkMenuItem host directive', () => {
        const cdkMenuItem = spectator.query(CdkMenuItem);
        expect(cdkMenuItem).toBeTruthy();
    });

    it('should not render icon when icon input is not set', () => {
        expect(spectator.query('ui-icon')).toBeFalsy();
    });

    it('should render icon when icon input is set', () => {
        spectator.component.icon = 'download';
        spectator.detectChanges();

        const icon = spectator.query('ui-icon');
        expect(icon).toBeTruthy();
    });

    it('should sync disabled state to CdkMenuItem', () => {
        spectator.component.disabled = true;
        spectator.detectChanges();

        const cdkMenuItem = spectator.query(CdkMenuItem)!;
        expect(cdkMenuItem.disabled).toBe(true);
    });

    it('should emit clicked when CdkMenuItem is triggered', () => {
        const item = spectator.query(DropdownMenuItemComponent)!;
        const clickedSpy = jest.fn();
        item.clicked.subscribe(clickedSpy);

        const cdkMenuItem = spectator.query(CdkMenuItem)!;
        cdkMenuItem.triggered.emit();

        expect(clickedSpy).toHaveBeenCalled();
    });
});
