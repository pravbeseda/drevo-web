import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { insertTagInView } from './insert-tag';

describe('insertTagInView', () => {
    let view: EditorView;

    afterEach(() => {
        view.destroy();
        document.body.innerHTML = '';
    });

    function createView(doc: string, selFrom: number, selTo?: number): EditorView {
        const state = EditorState.create({
            doc,
            selection: EditorSelection.single(selFrom, selTo ?? selFrom),
        });
        view = new EditorView({ state, parent: document.body });
        return view;
    }

    it('should insert tags with sample text when nothing is selected', () => {
        const v = createView('hello world', 5);

        insertTagInView(v, { tagOpen: '*', tagClose: '*', sampleText: 'жирный текст' });

        expect(v.state.doc.toString()).toBe('hello*жирный текст* world');
        expect(v.state.selection.main.from).toBe(6);
        expect(v.state.selection.main.to).toBe(18);
    });

    it('should wrap selected text with tags', () => {
        const v = createView('hello world', 6, 11);

        insertTagInView(v, { tagOpen: '*', tagClose: '*', sampleText: 'жирный текст' });

        expect(v.state.doc.toString()).toBe('hello *world*');
        expect(v.state.selection.main.from).toBe(7);
        expect(v.state.selection.main.to).toBe(12);
    });

    it('should handle empty tagClose', () => {
        const v = createView('', 0);

        insertTagInView(v, { tagOpen: '* ', tagClose: '', sampleText: 'элемент списка' });

        expect(v.state.doc.toString()).toBe('* элемент списка');
        expect(v.state.selection.main.from).toBe(2);
        expect(v.state.selection.main.to).toBe(16);
    });

    it('should handle multi-character tags', () => {
        const v = createView('some text', 5, 9);

        insertTagInView(v, { tagOpen: '((', tagClose: '))', sampleText: 'ссылка' });

        expect(v.state.doc.toString()).toBe('some ((text))');
        expect(v.state.selection.main.from).toBe(7);
        expect(v.state.selection.main.to).toBe(11);
    });

    it('should return true', () => {
        const v = createView('', 0);
        const result = insertTagInView(v, { tagOpen: '*', tagClose: '*', sampleText: 'text' });
        expect(result).toBe(true);
    });
});
