import { MatTooltip } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
    let spectator: Spectator<IconComponent>;
    const createComponent = createComponentFactory({
        component: IconComponent,
        imports: [NoopAnimationsModule],
    });

    it('should create', () => {
        spectator = createComponent({ props: { name: 'home' } });
        expect(spectator.component).toBeTruthy();
    });

    it('should display icon name', () => {
        spectator = createComponent({ props: { name: 'error_outline' } });
        expect(spectator.query('mat-icon')).toHaveText('error_outline');
    });

    it('should apply medium size by default', () => {
        spectator = createComponent({ props: { name: 'home' } });
        expect(spectator.query('mat-icon')).toHaveClass('medium');
    });

    it('should apply custom size', () => {
        spectator = createComponent({
            props: { name: 'home', size: 'xlarge' },
        });
        expect(spectator.query('mat-icon')).toHaveClass('xlarge');
    });

    it('should display tooltip when provided', () => {
        spectator = createComponent({
            props: { name: 'home', tooltip: 'Home page' },
        });
        const tooltipDirective = spectator.query('mat-icon', {
            read: MatTooltip,
        });
        expect(tooltipDirective).toBeTruthy();
        expect(tooltipDirective?.message).toBe('Home page');
    });

    it('should not display tooltip when not provided', () => {
        spectator = createComponent({ props: { name: 'home' } });
        const tooltipDirective = spectator.query('mat-icon', {
            read: MatTooltip,
        });
        expect(tooltipDirective?.message).toBeFalsy();
    });
});
