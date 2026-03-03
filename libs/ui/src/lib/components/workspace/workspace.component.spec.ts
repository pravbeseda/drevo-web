import { SpectatorHost, createHostFactory } from '@ngneat/spectator/jest';
import { IconComponent } from '../icon/icon.component';
import { WorkspaceTabComponent } from './workspace-tab.component';
import { WorkspaceComponent } from './workspace.component';

const HOST_TEMPLATE = `
    <ui-workspace (activeTabChange)="tabChanged($event)">
        <ui-workspace-tab label="Editor" icon="edit" [keepAlive]="true">
            <ng-template>
                <div data-testid="editor-content">Editor panel</div>
            </ng-template>
        </ui-workspace-tab>
        <ui-workspace-tab label="Preview" icon="visibility">
            <ng-template>
                <div data-testid="preview-content">Preview panel</div>
            </ng-template>
        </ui-workspace-tab>
        <ui-workspace-tab label="Diff" icon="difference">
            <ng-template>
                <div data-testid="diff-content">Diff panel</div>
            </ng-template>
        </ui-workspace-tab>
    </ui-workspace>
`;

describe('WorkspaceComponent', () => {
    let spectator: SpectatorHost<WorkspaceComponent>;
    const createHost = createHostFactory({
        component: WorkspaceComponent,
        imports: [WorkspaceTabComponent],
    });

    beforeEach(() => {
        spectator = createHost(HOST_TEMPLATE, {
            hostProps: { tabChanged: jest.fn() },
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render tab buttons for each tab', () => {
        const buttons = spectator.queryAll('.workspace-tab');
        expect(buttons).toHaveLength(3);
    });

    it('should display tab labels', () => {
        const labels = spectator.queryAll('.workspace-tab-label');
        expect(labels[0]).toHaveText('Editor');
        expect(labels[1]).toHaveText('Preview');
        expect(labels[2]).toHaveText('Diff');
    });

    it('should render icons for each tab', () => {
        const icons = spectator.queryAll(IconComponent);
        expect(icons).toHaveLength(3);
        expect(icons[0].name()).toBe('edit');
        expect(icons[1].name()).toBe('visibility');
        expect(icons[2].name()).toBe('difference');
    });

    it('should have first tab active by default', () => {
        expect(spectator.component.activeIndex()).toBe(0);

        const buttons = spectator.queryAll('.workspace-tab');
        expect(buttons[0]).toHaveClass('workspace-tab--active');
        expect(buttons[1]).not.toHaveClass('workspace-tab--active');
    });

    it('should show first tab content by default', () => {
        expect(spectator.query('[data-testid="editor-content"]')).toBeTruthy();
        expect(spectator.query('[data-testid="preview-content"]')).toBeFalsy();
        expect(spectator.query('[data-testid="diff-content"]')).toBeFalsy();
    });

    it('should switch active tab on click', () => {
        const buttons = spectator.queryAll('.workspace-tab');
        spectator.click(buttons[1]);

        expect(spectator.component.activeIndex()).toBe(1);
        expect(buttons[0]).not.toHaveClass('workspace-tab--active');
        expect(buttons[1]).toHaveClass('workspace-tab--active');
    });

    it('should emit activeTabChange on tab switch', () => {
        const buttons = spectator.queryAll('.workspace-tab');
        spectator.click(buttons[2]);

        expect(spectator.hostComponent['tabChanged']).toHaveBeenCalledWith(2);
    });

    it('should not emit activeTabChange when clicking already active tab', () => {
        const buttons = spectator.queryAll('.workspace-tab');
        spectator.click(buttons[0]);

        expect(spectator.hostComponent['tabChanged']).not.toHaveBeenCalled();
    });

    it('should keep keepAlive tab in DOM after switching away', () => {
        expect(spectator.query('[data-testid="editor-content"]')).toBeTruthy();

        const buttons = spectator.queryAll('.workspace-tab');
        spectator.click(buttons[1]);
        spectator.detectChanges();

        // keepAlive tab remains in DOM but is hidden
        const editorContent = spectator.query('[data-testid="editor-content"]');
        expect(editorContent).toBeTruthy();
        expect(editorContent?.closest('.workspace-panel')).toHaveClass('workspace-panel--hidden');

        // Second tab content is visible
        expect(spectator.query('[data-testid="preview-content"]')).toBeTruthy();
    });

    it('should remove non-keepAlive tab from DOM after switching away', () => {
        const buttons = spectator.queryAll('.workspace-tab');

        // Switch to second tab (non-keepAlive)
        spectator.click(buttons[1]);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="preview-content"]')).toBeTruthy();

        // Switch to third tab
        spectator.click(buttons[2]);
        spectator.detectChanges();

        // Second tab content removed from DOM
        expect(spectator.query('[data-testid="preview-content"]')).toBeFalsy();
        expect(spectator.query('[data-testid="diff-content"]')).toBeTruthy();
    });

    it('should set aria-label on tab buttons', () => {
        const buttons = spectator.queryAll('.workspace-tab');
        expect(buttons[0].getAttribute('aria-label')).toBe('Editor');
        expect(buttons[1].getAttribute('aria-label')).toBe('Preview');
        expect(buttons[2].getAttribute('aria-label')).toBe('Diff');
    });
});
