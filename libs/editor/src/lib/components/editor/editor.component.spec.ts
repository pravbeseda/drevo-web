import { TOOLBAR_GROUPS } from './editor-toolbar.config';
import { EditorFactoryService } from '../../services/editor-factory/editor-factory.service';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { EditorView } from '@codemirror/view';
import { EditorComponent } from './editor.component';

describe('EditorComponent', () => {
    let spectator: Spectator<EditorComponent>;
    let createStateSpy: jest.SpyInstance;

    const createComponent = createComponentFactory({
        component: EditorComponent,
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent({ props: { content: '' } });
        const editorFactory = spectator.debugElement.injector.get(EditorFactoryService);
        createStateSpy = jest.spyOn(editorFactory, 'createState').mockReturnValue(
            EditorView.defaultState,
        );
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should pass customExtensions to EditorFactoryService.createState', () => {
        spectator.setInput('customExtensions', [EditorView.lineWrapping]);
        spectator.detectChanges();

        expect(createStateSpy).toHaveBeenCalledWith('', [EditorView.lineWrapping]);
    });

    it('should pass empty array by default for customExtensions', () => {
        spectator.detectChanges();

        expect(createStateSpy).toHaveBeenCalledWith('', []);
    });

    describe('toolbar', () => {
        it('should render toolbar by default', () => {
            spectator.detectChanges();

            expect(spectator.query('.editor-toolbar')).toBeTruthy();
        });

        it('should hide toolbar when showToolbar is false', () => {
            spectator.setInput('showToolbar', false);
            spectator.detectChanges();

            expect(spectator.query('.editor-toolbar')).toBeFalsy();
        });

        it('should render all toolbar action buttons', () => {
            spectator.detectChanges();

            const expectedCount = TOOLBAR_GROUPS.reduce((sum, g) => sum + g.actions.length, 0);
            const buttons = spectator.queryAll('[data-testid^="toolbar-"]');
            expect(buttons.length).toBe(expectedCount);
        });

        it('should render custom actions', () => {
            const callback = jest.fn();
            spectator.setInput('customActions', [
                { icon: 'test_icon', tooltip: 'Test', callback },
            ]);
            spectator.detectChanges();

            const customButton = spectator.query('[data-testid="toolbar-custom-test_icon"]');
            expect(customButton).toBeTruthy();
        });

        it('should call custom action callback on click', () => {
            const callback = jest.fn();
            spectator.setInput('customActions', [
                { icon: 'test_icon', tooltip: 'Test', callback },
            ]);
            spectator.detectChanges();

            spectator.click('[data-testid="toolbar-custom-test_icon"]');
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should not render custom actions section when empty', () => {
            spectator.detectChanges();

            expect(spectator.query('[data-testid^="toolbar-custom-"]')).toBeFalsy();
        });
    });
});
