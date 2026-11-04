import { mixedScriptHintAt, mixedScriptMarks } from './mixed-script-marks';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const markSelector = '[data-testid="mixed-script-letter"]';

function createView(doc: string): EditorView {
    return new EditorView({ doc, extensions: [mixedScriptMarks] });
}

function markedLetters(view: EditorView): string[] {
    return Array.from(view.dom.querySelectorAll(markSelector), el => el.textContent ?? '');
}

function stateOf(doc: string): EditorState {
    return EditorState.create({ doc, extensions: [mixedScriptMarks] });
}

describe('mixedScriptMarks', () => {
    it('should mark the Latin letter in a Cyrillic word', () => {
        const view = createView('Преподобный cвятой Сергий');

        expect(markedLetters(view)).toEqual(['c']);
        view.destroy();
    });

    it('should mark the Cyrillic letter in a Latin word', () => {
        const view = createView('ОС Windоws');

        expect(markedLetters(view)).toEqual(['о']);
        view.destroy();
    });

    it('should mark every minority letter separately', () => {
        const view = createView('cвятoй');

        expect(markedLetters(view)).toEqual(['c', 'o']);
        view.destroy();
    });

    it.each(['святой Sergius', 'XIXв', 'см. https://site.ru/svyatoй', '`cвятой`'])(
        'should mark nothing in «%s»',
        doc => {
            const view = createView(doc);

            expect(markedLetters(view)).toEqual([]);
            view.destroy();
        },
    );

    it('should follow edits of the document', () => {
        const view = createView('святой');

        view.dispatch({ changes: { from: 0, to: 1, insert: 'c' } });
        expect(markedLetters(view)).toEqual(['c']);

        view.dispatch({ changes: { from: 0, to: 1, insert: 'с' } });
        expect(markedLetters(view)).toEqual([]);
        view.destroy();
    });
});

describe('mixedScriptHintAt', () => {
    const doc = 'Это cвятой и Windоws';
    const latinAt = doc.indexOf('c');
    const cyrillicAt = doc.indexOf('о', doc.indexOf('W'));

    it('should name a Latin letter among Cyrillic ones', () => {
        expect(mixedScriptHintAt(stateOf(doc), latinAt, 1)).toEqual({
            from: latinAt,
            to: latinAt + 1,
            message: 'Латинская «c» среди кириллицы',
        });
    });

    it('should name a Cyrillic letter among Latin ones', () => {
        expect(mixedScriptHintAt(stateOf(doc), cyrillicAt, 1)?.message).toBe('Кириллическая «о» среди латиницы');
    });

    it('should find the letter before the position when the pointer is on its left side', () => {
        expect(mixedScriptHintAt(stateOf(doc), latinAt + 1, -1)?.from).toBe(latinAt);
    });

    it.each([
        ['on the letter after the mark', latinAt + 1, 1],
        ['on the letter before the mark', latinAt, -1],
    ] as const)('should give no hint %s', (_, pos, side) => {
        expect(mixedScriptHintAt(stateOf(doc), pos, side)).toBeUndefined();
    });
});
