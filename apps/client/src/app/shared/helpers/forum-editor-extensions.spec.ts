import { forumEditorExtensions } from './forum-editor-extensions';
import { EditorState } from '@codemirror/state';
import { EditorView, runScopeHandlers } from '@codemirror/view';

describe('forumEditorExtensions', () => {
    let view: EditorView;
    const submit = jest.fn();

    beforeEach(() => {
        submit.mockReset();
        view = new EditorView({
            state: EditorState.create({ extensions: forumEditorExtensions('Сообщение', submit) }),
            parent: document.body,
        });
    });

    afterEach(() => view.destroy());

    it('sends on Ctrl+Enter', () => {
        const handled = runScopeHandlers(view, new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }), 'editor');

        expect(handled).toBe(true);
        expect(submit).toHaveBeenCalledTimes(1);
    });

    it('leaves a plain Enter to the text', () => {
        runScopeHandlers(view, new KeyboardEvent('keydown', { key: 'Enter' }), 'editor');

        expect(submit).not.toHaveBeenCalled();
    });

    it('hints what the empty field is for', () => {
        expect(view.dom.querySelector('.cm-placeholder')?.textContent).toBe('Сообщение');
    });
});
