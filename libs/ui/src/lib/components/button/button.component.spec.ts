import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ButtonComponent } from './button.component';

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

    it('should render filled button by default', () => {
        const button = spectator.query('button');
        expect(button?.classList).toContain('mat-mdc-unelevated-button');
    });

    it('should render outlined button when variant is outlined', () => {
        spectator.setInput('variant', 'outlined');

        const button = spectator.query('button');
        expect(button?.classList).toContain('mat-mdc-outlined-button');
    });

    it('should render text button when variant is text', () => {
        spectator.setInput('variant', 'text');

        const button = spectator.query('button');
        expect(button?.classList).toContain('mat-mdc-button');
    });

    it('should propagate native click when not disabled', () => {
        const clickSpy = jest.fn();
        spectator.element.addEventListener('click', clickSpy);

        spectator.click('button');

        expect(clickSpy).toHaveBeenCalled();
    });

    it('should block native click when disabled', () => {
        spectator.setInput('disabled', true);
        const clickSpy = jest.fn();
        spectator.element.addEventListener('click', clickSpy);

        // Disabled button doesn't fire click, so dispatch on host directly
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        spectator.element.dispatchEvent(event);

        expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should block native click when loading', () => {
        spectator.setInput('loading', true);
        const clickSpy = jest.fn();
        spectator.element.addEventListener('click', clickSpy);

        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        spectator.element.dispatchEvent(event);

        expect(clickSpy).not.toHaveBeenCalled();
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

    describe('accent', () => {
        it('should apply accent-secondary class by default', () => {
            const button = spectator.query('button');
            expect(button?.classList).toContain('accent-secondary');
        });

        it('should apply accent-primary class when accent is primary', () => {
            spectator.setInput('accent', 'primary');

            const button = spectator.query('button');
            expect(button?.classList).toContain('accent-primary');
        });

        it('should apply accent-danger class when accent is danger', () => {
            spectator.setInput('accent', 'danger');

            const button = spectator.query('button');
            expect(button?.classList).toContain('accent-danger');
        });

        it('should apply accent-success class when accent is success', () => {
            spectator.setInput('accent', 'success');

            const button = spectator.query('button');
            expect(button?.classList).toContain('accent-success');
        });

        it('should apply accent-warning class when accent is warning', () => {
            spectator.setInput('accent', 'warning');

            const button = spectator.query('button');
            expect(button?.classList).toContain('accent-warning');
        });
    });

    describe('with link', () => {
        it('should render anchor tag when link is provided', () => {
            spectator.setInput('link', '/test-link');

            const anchor = spectator.query('a');
            const button = spectator.query('button');
            expect(anchor).toBeTruthy();
            expect(button).toBeFalsy();
        });

        it('should render filled anchor by default', () => {
            spectator.setInput('link', '/test-link');

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('mat-mdc-unelevated-button');
        });

        it('should render outlined anchor when variant is outlined', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('variant', 'outlined');

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('mat-mdc-outlined-button');
        });

        it('should render text anchor when variant is text', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('variant', 'text');

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('mat-mdc-button');
        });

        it('should propagate click on anchor when not disabled', () => {
            spectator.setInput('link', '/test-link');
            const clickSpy = jest.fn();
            spectator.element.addEventListener('click', clickSpy);

            spectator.click('a');

            expect(clickSpy).toHaveBeenCalled();
        });

        it('should apply full-width class to anchor when fullWidth is true', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('fullWidth', true);

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('full-width');
        });

        it('should preventDefault on anchor click when disabled', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('disabled', true);

            const anchor = spectator.query('a') as HTMLAnchorElement;
            const event = new MouseEvent('click', { cancelable: true, bubbles: true });
            anchor.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
        });

        it('should preventDefault on anchor click when loading', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('loading', true);

            const anchor = spectator.query('a') as HTMLAnchorElement;
            const event = new MouseEvent('click', { cancelable: true, bubbles: true });
            anchor.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
        });

        it('should have disabled class when disabled', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('disabled', true);

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('disabled');
        });

        it('should have disabled class when loading', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('loading', true);

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('disabled');
        });

        it('should have aria-disabled attribute when disabled', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('disabled', true);

            const anchor = spectator.query('a');
            expect(anchor?.getAttribute('aria-disabled')).toBe('true');
        });

        it('should show spinner when loading', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('loading', true);

            const spinner = spectator.query('mat-spinner');
            expect(spinner).toBeTruthy();
        });

        it('should apply accent class on anchor', () => {
            spectator.setInput('link', '/test-link');
            spectator.setInput('accent', 'danger');

            const anchor = spectator.query('a');
            expect(anchor?.classList).toContain('accent-danger');
        });
    });
});
