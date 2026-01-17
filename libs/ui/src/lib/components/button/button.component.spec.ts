import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ButtonComponent } from './button.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ButtonComponent', () => {
    let spectator: Spectator<ButtonComponent>;
    const createComponent = createComponentFactory({
        component: ButtonComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render primary button by default', () => {
        const button = spectator.query('button');
        expect(button?.classList).toContain('mat-mdc-unelevated-button');
    });

    it('should render secondary button when variant is secondary', () => {
        spectator.setInput('variant', 'secondary');

        const button = spectator.query('button');
        expect(button?.classList).toContain('mat-mdc-outlined-button');
    });

    it('should render text button when variant is text', () => {
        spectator.setInput('variant', 'text');

        const button = spectator.query('button');
        expect(button?.classList).toContain('mat-mdc-button');
    });

    it('should emit clicked event on click', () => {
        const clickedSpy = jest.fn();
        spectator.component.clicked.subscribe(clickedSpy);

        spectator.click('button');

        expect(clickedSpy).toHaveBeenCalled();
    });

    it('should not emit clicked when disabled', () => {
        spectator.setInput('disabled', true);
        const clickedSpy = jest.fn();
        spectator.component.clicked.subscribe(clickedSpy);

        spectator.click('button');

        expect(clickedSpy).not.toHaveBeenCalled();
    });

    it('should show spinner when loading', () => {
        spectator.setInput('loading', true);

        const spinner = spectator.query('mat-spinner');
        expect(spinner).toBeTruthy();
    });

    it('should be disabled when loading', () => {
        spectator.setInput('loading', true);

        const button = spectator.query('button') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
    });

    it('should have correct type attribute', () => {
        spectator.setInput('type', 'submit');

        const button = spectator.query('button') as HTMLButtonElement;
        expect(button.type).toBe('submit');
    });

    it('should apply full-width class when fullWidth is true', () => {
        spectator.setInput('fullWidth', true);

        const button = spectator.query('button');
        expect(button?.classList).toContain('full-width');
    });
});
