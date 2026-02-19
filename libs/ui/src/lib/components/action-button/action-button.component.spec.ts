import { RouterTestingModule } from '@angular/router/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActionButtonComponent } from './action-button.component';

describe('ActionButtonComponent', () => {
    let spectator: Spectator<ActionButtonComponent>;

    const createComponent = createComponentFactory({
        component: ActionButtonComponent,
        imports: [RouterTestingModule],
    });

    beforeEach(() => {
        spectator = createComponent({
            props: {
                icon: 'edit',
                label: 'Edit',
            },
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
        const icon = spectator.query('mat-icon');

        expect(icon?.textContent?.trim()).toBe('edit');
    });

    it('should have label as aria-label', () => {
        const button = spectator.query('button');

        expect(button?.getAttribute('aria-label')).toBe('Edit');
    });

    describe('priority', () => {
        it('should apply primary class when priority is primary', () => {
            spectator.setInput('priority', 'primary');

            expect(spectator.query('.action-button--primary')).toBeTruthy();
            expect(spectator.query('.action-button--secondary')).toBeFalsy();
        });

        it('should apply secondary class when priority is secondary', () => {
            spectator.setInput('priority', 'secondary');

            expect(spectator.query('.action-button--secondary')).toBeTruthy();
            expect(spectator.query('.action-button--primary')).toBeFalsy();
        });

        it('should default to secondary priority', () => {
            expect(spectator.component.priority()).toBe('secondary');
            expect(spectator.query('.action-button--secondary')).toBeTruthy();
        });
    });

    describe('size', () => {
        it('should render mat-fab by default', () => {
            expect(spectator.query('[mat-fab]')).toBeTruthy();
            expect(spectator.query('[mat-mini-fab]')).toBeFalsy();
        });

        it('should render mat-mini-fab when size is mini', () => {
            spectator.setInput('size', 'mini');

            expect(spectator.query('[mat-mini-fab]')).toBeTruthy();
            expect(spectator.query('[mat-fab]')).toBeFalsy();
        });
    });

    describe('variant', () => {
        it('should apply main variant class', () => {
            spectator.setInput('variant', 'main');

            expect(spectator.query('.action-button--main')).toBeTruthy();
        });

        it('should apply menu variant class', () => {
            spectator.setInput('variant', 'menu');

            expect(spectator.query('.action-button--menu')).toBeTruthy();
        });

        it('should apply speed-dial variant class', () => {
            spectator.setInput('variant', 'speed-dial');

            expect(spectator.query('.action-button--speed-dial')).toBeTruthy();
        });
    });

    describe('tooltip', () => {
        it('should show tooltip by default', () => {
            expect(spectator.component.showTooltip()).toBe(true);
        });

        it('should hide tooltip when showTooltip is false', () => {
            spectator.setInput('showTooltip', false);

            expect(spectator.component.showTooltip()).toBe(false);
        });
    });

    describe('showLabel', () => {
        it('should not show label by default', () => {
            expect(spectator.query('.action-button__label')).toBeFalsy();
        });

        it('should show label when showLabel is true', () => {
            spectator.setInput('showLabel', true);

            const label = spectator.query('.action-button__label');

            expect(label).toBeTruthy();
            expect(label?.textContent?.trim()).toBe('Edit');
        });
    });

    describe('link', () => {
        it('should render anchor when link is provided', () => {
            spectator.setInput('link', '/edit/123');

            expect(spectator.query('a')).toBeTruthy();
            expect(spectator.query('button')).toBeFalsy();
        });

        it('should render button when link is not provided', () => {
            expect(spectator.query('button')).toBeTruthy();
            expect(spectator.query('a')).toBeFalsy();
        });
    });

    describe('disabled', () => {
        it('should disable button when disabled is true', () => {
            spectator.setInput('disabled', true);

            const button = spectator.query('button');

            expect(button?.hasAttribute('disabled')).toBe(true);
        });

        it('should not disable button when disabled is false', () => {
            spectator.setInput('disabled', false);

            const button = spectator.query('button');

            expect(button?.hasAttribute('disabled')).toBe(false);
        });

        it('should render button instead of anchor when link is provided but disabled', () => {
            spectator.setInput('link', '/edit/123');
            spectator.setInput('disabled', true);

            expect(spectator.query('button')).toBeTruthy();
            expect(spectator.query('a')).toBeFalsy();
        });

        it('should have disabled attribute when link is provided but disabled', () => {
            spectator.setInput('link', '/edit/123');
            spectator.setInput('disabled', true);

            const button = spectator.query('button');

            expect(button?.hasAttribute('disabled')).toBe(true);
        });
    });
});
