import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { CdkMenu } from '@angular/cdk/menu';
import { DropdownMenuComponent } from './dropdown-menu.component';

describe('DropdownMenuComponent', () => {
    let spectator: Spectator<DropdownMenuComponent>;
    const createComponent = createComponentFactory({
        component: DropdownMenuComponent,
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should have CdkMenu host directive', () => {
        const cdkMenu = spectator.inject(CdkMenu, true);
        expect(cdkMenu).toBeTruthy();
    });
});
