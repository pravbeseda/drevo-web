import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { wikiHighlighter } from './wiki-highlighter';

describe('wikiHighlighter', () => {
    let state: EditorState;
    let view: EditorView;

    beforeEach(() => {
        state = EditorState.create({
            doc: '[[Пример сноски]] и ((ссылка))',
            extensions: [wikiHighlighter],
        });
        view = new EditorView({ state });
    });

    afterEach(() => {
        view.destroy();
    });

    it('should set class cm-footnote to notes', () => {
        const footnoteElement = view.dom.querySelector('.cm-footnote');
        expect(footnoteElement).not.toBeNull();
        expect(footnoteElement?.textContent).toBe('[[Пример сноски]]');
    });

    it('should set class cm-link to links', () => {
        const linkElement = view.dom.querySelector('.cm-link');
        expect(linkElement).not.toBeNull();
        expect(linkElement?.textContent).toBe('((ссылка))');
    });
});
