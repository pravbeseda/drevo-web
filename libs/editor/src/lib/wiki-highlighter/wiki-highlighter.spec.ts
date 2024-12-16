import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { wikiHighlighter } from './wiki-highlighter';

const sampleText = '[[Пример сноски]] и ((ссылка))';

describe('wikiHighlighter', () => {
    let view: EditorView;

    beforeEach(() => {
        view = getView(sampleText);
    });

    afterEach(() => {
        view.destroy();
    });

    it('should set class cm-footnote to notes', () => {
        const footnoteElement = view.dom.querySelector('.cm-footnote');
        expect(footnoteElement).not.toBeNull();
        expect(footnoteElement?.textContent).toBe('[[Пример сноски]]');
    });

    it.each([
        {
            sample: '[[Пример сноски]] и ((ссылка))',
            result: '((ссылка))',
        },
        {
            sample: 'текст ((Имя (Фамилия))) текст',
            result: '((Имя (Фамилия)))',
        },
        {
            sample: 'текст ((Имя (Фамилия)))) текст',
            result: '((Имя (Фамилия)))',
        },
        {
            sample: 'текст ((Имя (Фамилия)=Другое имя (Фамилия)))) текст',
            result: '((Имя (Фамилия)=Другое имя (Фамилия)))',
        },
    ])('should highlight links for "$sample"', ({ sample, result }) => {
        const view = getView(sample);
        const linkElement = view.dom.querySelector('.cm-link');
        expect(linkElement).not.toBeNull();
        expect(linkElement?.textContent).toBe(result);
    });
});

function getView(text: string): EditorView {
    const state = EditorState.create({
        doc: text,
        extensions: [wikiHighlighter],
    });
    return new EditorView({ state });
}
