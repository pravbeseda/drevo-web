import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { DropdownMenuComponent } from './dropdown-menu.component';

describe('DropdownMenuComponent', () => {
    let spectator: Spectator<DropdownMenuComponent>;
    const createComponent = createComponentFactory({
        component: DropdownMenuComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should expose menu viewChild', () => {
        expect(spectator.component.menu()).toBeTruthy();
    });
});
