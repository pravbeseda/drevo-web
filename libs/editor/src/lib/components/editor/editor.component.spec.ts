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
});
