import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { IconButtonComponent } from './icon-button.component';

describe('IconButtonComponent', () => {
    let spectator: Spectator<IconButtonComponent>;

    const createComponent = createComponentFactory({
        component: IconButtonComponent,
    });

    beforeEach(() => {
        spectator = createComponent({
            props: { icon: 'settings' },
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should emit clicked event on click', () => {
        const clickedSpy = jest.fn();
        spectator.component.clicked.subscribe(clickedSpy);

        spectator.click('button');

        expect(clickedSpy).toHaveBeenCalled();
    });

    it('should display the icon', () => {
        expect(spectator.component.icon()).toBe('settings');
    });

    it('should have label as aria-label', () => {
        spectator.setInput('label', 'Settings');

        expect(spectator.component.label()).toBe('Settings');
        expect(spectator.query('button')?.getAttribute('aria-label')).toBe(
            'Settings'
        );
    });

    it('should disable button when disabled input is true', () => {
        spectator.setInput('disabled', true);

        expect(spectator.query('button')?.hasAttribute('disabled')).toBe(true);
    });

    it('should render mat-icon with correct icon name', () => {
        const icon = spectator.query('mat-icon');

        expect(icon?.textContent?.trim()).toBe('settings');
    });
});
