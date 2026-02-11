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
        const panel = spectator.query('.side-panel');
        expect(panel?.classList).not.toContain('open');
    });

    it('should not render backdrop when closed', () => {
        expect(spectator.query('.side-panel-backdrop')).toBeFalsy();
    });

    it('should show panel when open', () => {
        spectator.setInput('open', true);

        const panel = spectator.query('.side-panel');
        expect(panel?.classList).toContain('open');
    });

    it('should render backdrop when open', () => {
        spectator.setInput('open', true);

        expect(spectator.query('.side-panel-backdrop')).toBeTruthy();
    });

    it('should display title', () => {
        spectator.setInput('title', 'Фильтры');

        const title = spectator.query('.side-panel-title');
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

        spectator.click('.side-panel-backdrop');

        expect(closedSpy).toHaveBeenCalled();
    });

    it('should have dialog role and aria-modal', () => {
        const panel = spectator.query('.side-panel');
        expect(panel?.getAttribute('role')).toBe('dialog');
        expect(panel?.getAttribute('aria-modal')).toBe('true');
    });

    it('should have content container', () => {
        spectator.setInput('open', true);

        const content = spectator.query('.side-panel-content');
        expect(content).toBeTruthy();
    });
});
