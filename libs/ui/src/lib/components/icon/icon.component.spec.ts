import { MatIconRegistry } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DomSanitizer } from '@angular/platform-browser';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { IconComponent } from './icon.component';

function registerFakeSvgIcon(spectator: Spectator<IconComponent>, name: string): void {
    const registry = spectator.inject(MatIconRegistry);
    const sanitizer = spectator.inject(DomSanitizer);
    registry.addSvgIconLiteral(name, sanitizer.bypassSecurityTrustHtml('<svg></svg>'));
}

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

    describe('svgIcon', () => {
        const SVG_ICON_NAME = 'topic_person';

        const createSvgComponent = createComponentFactory({
            component: IconComponent,
            imports: [NoopAnimationsModule],
            detectChanges: false,
        });

        it('should render mat-icon with svgIcon when svgIcon is provided', () => {
            spectator = createSvgComponent({ props: { name: 'home', svgIcon: SVG_ICON_NAME } });
            registerFakeSvgIcon(spectator, SVG_ICON_NAME);
            spectator.detectChanges();

            const icon = spectator.query('mat-icon');

            expect(icon).toBeTruthy();
            expect(icon?.getAttribute('data-mat-icon-name')).toBe(SVG_ICON_NAME);
        });

        it('should not render icon name text when svgIcon is provided', () => {
            spectator = createSvgComponent({ props: { name: 'home', svgIcon: SVG_ICON_NAME } });
            registerFakeSvgIcon(spectator, SVG_ICON_NAME);
            spectator.detectChanges();

            const icon = spectator.query('mat-icon');

            expect(icon?.textContent?.trim()).not.toContain('home');
        });

        it('should render icon name text when svgIcon is not provided', () => {
            spectator = createSvgComponent({ props: { name: 'home' } });
            spectator.detectChanges();

            const icon = spectator.query('mat-icon');

            expect(icon).toHaveText('home');
            expect(icon?.getAttribute('svgicon')).toBeFalsy();
        });

        it('should apply size class when svgIcon is provided', () => {
            spectator = createSvgComponent({ props: { name: 'home', svgIcon: SVG_ICON_NAME, size: 'small' } });
            registerFakeSvgIcon(spectator, SVG_ICON_NAME);
            spectator.detectChanges();

            expect(spectator.query('mat-icon')).toHaveClass('small');
        });

        it('should display tooltip when svgIcon and tooltip are provided', () => {
            spectator = createSvgComponent({
                props: { name: 'home', svgIcon: SVG_ICON_NAME, tooltip: 'Person' },
            });
            registerFakeSvgIcon(spectator, SVG_ICON_NAME);
            spectator.detectChanges();

            const tooltipDirective = spectator.query('mat-icon', {
                read: MatTooltip,
            });

            expect(tooltipDirective?.message).toBe('Person');
        });
    });
});
