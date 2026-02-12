import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { SidePanelComponent } from './side-panel.component';

describe('SidePanelComponent', () => {
    let spectator: Spectator<SidePanelComponent>;

    const createComponent = createComponentFactory({
        component: SidePanelComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should hide panel by default', () => {
        const panel = spectator.query('[data-testid="side-panel"]');
        expect(panel?.classList).not.toContain('open');
    });

    it('should not render backdrop when closed', () => {
        expect(spectator.query('[data-testid="side-panel-backdrop"]')).toBeFalsy();
    });

    it('should show panel when open', () => {
        spectator.setInput('open', true);

        const panel = spectator.query('[data-testid="side-panel"]');
        expect(panel?.classList).toContain('open');
    });

    it('should render backdrop when open', () => {
        spectator.setInput('open', true);

        expect(spectator.query('[data-testid="side-panel-backdrop"]')).toBeTruthy();
    });

    it('should display title', () => {
        spectator.setInput('title', 'Фильтры');

        const title = spectator.query('[data-testid="side-panel-title"]');
        expect(title?.textContent?.trim()).toBe('Фильтры');
    });

    it('should emit closed when close button clicked', () => {
        spectator.setInput('open', true);
        const closedSpy = jest.fn();
        spectator.component.closed.subscribe(closedSpy);

        spectator.click('ui-icon-button button');

        expect(closedSpy).toHaveBeenCalled();
    });

    it('should emit closed when backdrop clicked', () => {
        spectator.setInput('open', true);
        const closedSpy = jest.fn();
        spectator.component.closed.subscribe(closedSpy);

        spectator.click('[data-testid="side-panel-backdrop"]');

        expect(closedSpy).toHaveBeenCalled();
    });

    it('should emit closed on Escape when open', () => {
        spectator.setInput('open', true);
        const closedSpy = jest.fn();
        spectator.component.closed.subscribe(closedSpy);

        spectator.dispatchKeyboardEvent(document, 'keydown', 'Escape');

        expect(closedSpy).toHaveBeenCalled();
    });

    it('should not emit closed on Escape when closed', () => {
        const closedSpy = jest.fn();
        spectator.component.closed.subscribe(closedSpy);

        spectator.dispatchKeyboardEvent(document, 'keydown', 'Escape');

        expect(closedSpy).not.toHaveBeenCalled();
    });

    it('should have dialog role', () => {
        const panel = spectator.query('[data-testid="side-panel"]');
        expect(panel?.getAttribute('role')).toBe('dialog');
    });

    it('should set aria-modal only when open', () => {
        const panel = spectator.query('[data-testid="side-panel"]');
        expect(panel?.getAttribute('aria-modal')).toBeNull();

        spectator.setInput('open', true);
        expect(panel?.getAttribute('aria-modal')).toBe('true');
    });

    it('should be aria-hidden and inert when closed', () => {
        const panel = spectator.query('[data-testid="side-panel"]');
        expect(panel?.getAttribute('aria-hidden')).toBe('true');
        expect(panel?.hasAttribute('inert')).toBe(true);
    });

    it('should not be aria-hidden or inert when open', () => {
        spectator.setInput('open', true);

        const panel = spectator.query('[data-testid="side-panel"]');
        expect(panel?.getAttribute('aria-hidden')).toBe('false');
        expect(panel?.hasAttribute('inert')).toBe(false);
    });

    it('should set aria-label from title', () => {
        spectator.setInput('title', 'Фильтры');

        const panel = spectator.query('[data-testid="side-panel"]');
        expect(panel?.getAttribute('aria-label')).toBe('Фильтры');
    });

    it('should have content container', () => {
        spectator.setInput('open', true);

        const content = spectator.query('[data-testid="side-panel-content"]');
        expect(content).toBeTruthy();
    });
});
