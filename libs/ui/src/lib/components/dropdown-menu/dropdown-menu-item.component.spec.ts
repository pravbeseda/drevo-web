import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { DropdownMenuItemComponent } from './dropdown-menu-item.component';

describe('DropdownMenuItemComponent', () => {
    let spectator: Spectator<DropdownMenuItemComponent>;
    const createComponent = createComponentFactory({
        component: DropdownMenuItemComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render a mat-menu-item button', () => {
        const button = spectator.query('button');
        expect(button).toBeTruthy();
        expect(button?.classList).toContain('mat-mdc-menu-item');
    });

    it('should not render icon when icon input is not set', () => {
        expect(spectator.query('mat-icon')).toBeFalsy();
    });

    it('should render icon when icon input is set', () => {
        spectator.setInput('icon', 'download');

        const icon = spectator.query('mat-icon');
        expect(icon).toBeTruthy();
        expect(icon?.textContent?.trim()).toBe('download');
    });

    it('should emit clicked on click', () => {
        const clickedSpy = jest.fn();
        spectator.component.clicked.subscribe(clickedSpy);

        spectator.click('button');

        expect(clickedSpy).toHaveBeenCalled();
    });

    it('should disable button when disabled is true', () => {
        spectator.setInput('disabled', true);

        const button = spectator.query('button') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
    });

    it('should not emit clicked when disabled', () => {
        spectator.setInput('disabled', true);
        const clickedSpy = jest.fn();
        spectator.component.clicked.subscribe(clickedSpy);

        spectator.click('button');

        expect(clickedSpy).not.toHaveBeenCalled();
    });
});
