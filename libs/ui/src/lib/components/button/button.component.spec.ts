import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ButtonComponent } from './button.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

describe('ButtonComponent', () => {
    let spectator: Spectator<ButtonComponent>;
    const createComponent = createComponentFactory({
        component: ButtonComponent,
        imports: [NoopAnimationsModule],
        providers: [provideRouter([{ path: '**', children: [] }])],
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

    describe('with href', () => {
        it('should render anchor tag when href is provided', () => {
            spectator.setInput('href', '/test-link');

            const anchor = spectator.query('a');
            const button = spectator.query('button');
            expect(anchor).toBeTruthy();
            expect(button).toBeFalsy();
        });

        it('should render primary anchor by default', () => {
            spectator.setInput('href', '/test-link');

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('mat-mdc-unelevated-button');
        });

        it('should render secondary anchor when variant is secondary', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('variant', 'secondary');

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('mat-mdc-outlined-button');
        });

        it('should render text anchor when variant is text', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('variant', 'text');

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('mat-mdc-button');
        });

        it('should emit clicked event on anchor click', () => {
            spectator.setInput('href', '/test-link');
            const clickedSpy = jest.fn();
            spectator.component.clicked.subscribe(clickedSpy);

            spectator.click('a');

            expect(clickedSpy).toHaveBeenCalled();
        });

        it('should apply full-width class to anchor when fullWidth is true', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('fullWidth', true);

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('full-width');
        });

        it('should not emit clicked when anchor is disabled', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('disabled', true);
            const clickedSpy = jest.fn();
            spectator.component.clicked.subscribe(clickedSpy);

            spectator.click('a');

            expect(clickedSpy).not.toHaveBeenCalled();
        });

        it('should not emit clicked when anchor is loading', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('loading', true);
            const clickedSpy = jest.fn();
            spectator.component.clicked.subscribe(clickedSpy);

            spectator.click('a');

            expect(clickedSpy).not.toHaveBeenCalled();
        });

        it('should have disabled class when disabled', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('disabled', true);

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('disabled');
        });

        it('should have disabled class when loading', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('loading', true);

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('disabled');
        });

        it('should have aria-disabled attribute when disabled', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('disabled', true);

            const anchor = spectator.query('a');
            expect(anchor?.getAttribute('aria-disabled')).toBe('true');
        });

        it('should show spinner when loading', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('loading', true);

            const spinner = spectator.query('mat-spinner');
            expect(spinner).toBeTruthy();
        });

        it('should preventDefault on click when disabled', () => {
            spectator.setInput('href', '/test-link');
            spectator.setInput('disabled', true);

            const anchor = spectator.query('a') as HTMLAnchorElement;
            const event = new MouseEvent('click', { cancelable: true });
            anchor.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
        });
    });
});
