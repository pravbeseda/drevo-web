import { MatTooltip } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { IconButtonComponent } from './icon-button.component';

describe('IconButtonComponent', () => {
    let spectator: Spectator<IconButtonComponent>;

    const createComponent = createComponentFactory({
        component: IconButtonComponent,
        imports: [NoopAnimationsModule],
        providers: [provideRouter([])],
    });

    describe('button mode', () => {
        beforeEach(() => {
            spectator = createComponent({
                props: { icon: 'settings' },
            });
        });

        it('should create', () => {
            expect(spectator.component).toBeTruthy();
        });

        it('should render a button', () => {
            expect(spectator.query('button')).toBeTruthy();
            expect(spectator.query('a')).toBeFalsy();
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

            expect(spectator.query('button')?.getAttribute('aria-label')).toBe('Settings');
        });

        it('should disable button when disabled input is true', () => {
            spectator.setInput('disabled', true);

            expect(spectator.query('button')?.hasAttribute('disabled')).toBe(true);
        });

        it('should render mat-icon with correct icon name', () => {
            const icon = spectator.query('mat-icon');

            expect(icon?.textContent?.trim()).toBe('settings');
        });

        it('should have matTooltip with label text', () => {
            spectator.setInput('label', 'Settings');

            const tooltipDirective = spectator.query('span', {
                read: MatTooltip,
            });

            expect(tooltipDirective).toBeTruthy();
            expect(tooltipDirective?.message).toBe('Settings');
        });

        it('should show tooltip even when button is disabled', () => {
            spectator.setInput('label', 'Settings');
            spectator.setInput('disabled', true);

            const tooltipDirective = spectator.query('span', {
                read: MatTooltip,
            });

            expect(tooltipDirective).toBeTruthy();
            expect(tooltipDirective?.message).toBe('Settings');
            expect(tooltipDirective?.disabled).toBe(false);
        });
    });

    describe('link mode', () => {
        beforeEach(() => {
            spectator = createComponent({
                props: {
                    icon: 'difference',
                    label: 'View diff',
                    link: ['/history/diff', 42],
                },
            });
        });

        it('should render an anchor instead of a button', () => {
            expect(spectator.query('a')).toBeTruthy();
            expect(spectator.query('button')).toBeFalsy();
        });

        it('should set routerLink href', () => {
            expect(spectator.query('a')?.getAttribute('href')).toBe('/history/diff/42');
        });

        it('should have aria-label on anchor', () => {
            expect(spectator.query('a')?.getAttribute('aria-label')).toBe('View diff');
        });

        it('should render mat-icon inside anchor', () => {
            const icon = spectator.query('a mat-icon');

            expect(icon?.textContent?.trim()).toBe('difference');
        });

        it('should have matTooltip with label text', () => {
            const tooltipDirective = spectator.query('span', {
                read: MatTooltip,
            });

            expect(tooltipDirective?.message).toBe('View diff');
        });
    });

    describe('disabled link', () => {
        beforeEach(() => {
            spectator = createComponent({
                props: {
                    icon: 'difference',
                    label: 'View diff',
                    link: ['/history/diff', 42],
                    disabled: true,
                },
            });
        });

        it('should render a disabled button instead of a link when disabled is true', () => {
            expect(spectator.query('a')).toBeFalsy();
            expect(spectator.query('button')).toBeTruthy();
            expect(spectator.query('button')?.hasAttribute('disabled')).toBe(true);
        });
    });
});
