import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTooltip } from '@angular/material/tooltip';
import { createComponentFactory, createHostFactory, Spectator, SpectatorHost } from '@ngneat/spectator/jest';
import { LineClampComponent } from './line-clamp.component';

describe('LineClampComponent', () => {
    let spectator: Spectator<LineClampComponent>;
    const createComponent = createComponentFactory({
        component: LineClampComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should have default lines input of 2', () => {
        expect(spectator.component.lines()).toBe(2);
    });

    it('should have empty tooltip by default', () => {
        expect(spectator.component.tooltip()).toBe('');
    });

    it('should set --lines CSS custom property on host', () => {
        expect(spectator.element.style.getPropertyValue('--lines')).toBe('2');
    });

    it('should update --lines when input changes', () => {
        spectator.setInput('lines', 3);

        expect(spectator.element.style.getPropertyValue('--lines')).toBe('3');
    });

    it('should render content span with line-clamp-content class', () => {
        expect(spectator.query('.line-clamp-content')).toBeTruthy();
    });

    it('should have tooltip disabled when text is not truncated', () => {
        spectator.setInput('tooltip', 'Some text');

        const tooltipDirective = spectator.query(MatTooltip);
        expect(tooltipDirective?.disabled).toBe(true);
    });

    it('should set matTooltip text from tooltip input', () => {
        spectator.setInput('tooltip', 'Full tooltip text');

        const tooltipDirective = spectator.query(MatTooltip);
        expect(tooltipDirective?.message).toBe('Full tooltip text');
    });
});

describe('LineClampComponent with content', () => {
    let spectator: SpectatorHost<LineClampComponent>;
    const createHost = createHostFactory({
        component: LineClampComponent,
        imports: [NoopAnimationsModule],
    });

    it('should project content', () => {
        spectator = createHost('<ui-line-clamp>Projected text</ui-line-clamp>');

        expect(spectator.query('.line-clamp-content')?.textContent?.trim()).toBe('Projected text');
    });
});

describe('LineClampComponent truncation detection', () => {
    let spectator: Spectator<LineClampComponent>;
    const createComponent = createComponentFactory({
        component: LineClampComponent,
        imports: [NoopAnimationsModule],
        detectChanges: false,
    });

    it('should enable tooltip when text is truncated', () => {
        spectator = createComponent();
        spectator.detectChanges();

        const contentEl = spectator.query('.line-clamp-content') as HTMLElement;
        Object.defineProperty(contentEl, 'scrollHeight', { value: 60, configurable: true });
        Object.defineProperty(contentEl, 'clientHeight', { value: 40, configurable: true });

        // Manually trigger truncation check via component internals
        spectator.component['checkTruncation']();

        expect(spectator.component.isTruncated()).toBe(true);
    });

    it('should disable tooltip when text fits', () => {
        spectator = createComponent();
        spectator.detectChanges();

        const contentEl = spectator.query('.line-clamp-content') as HTMLElement;
        Object.defineProperty(contentEl, 'scrollHeight', { value: 40, configurable: true });
        Object.defineProperty(contentEl, 'clientHeight', { value: 40, configurable: true });

        spectator.component['checkTruncation']();

        expect(spectator.component.isTruncated()).toBe(false);
    });
});
