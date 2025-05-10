// list-commands.spec.ts
import { EditorState } from '@codemirror/state';
import { continueLists } from './list-commands';
import { EditorView, keymap } from '@codemirror/view';

type Case = { title: string; prev: string; next: string };

describe('List commands tests', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('continueLists', () => {
        const continueCases: Case[] = [
            {
                title: 'should not handle simple string',
                prev: 'hello| world',
                next: 'hello| world',
            },

            {
                title: 'should not handle bold text',
                prev: '*hello*| world',
                next: '*hello*| world',
            },
            {
                title: 'should handle list with bold text',
                prev: '* *hello*| world',
                next: '* *hello*\n* | world',
            },
            {
                title: 'should continue list',
                prev: '* item|',
                next: '* item\n* |',
            },
            {
                title: 'should skip list after empy item',
                prev: '*|',
                next: '\n|',
            },
        ];

        continueCases.forEach(({ title, prev, next }) => {
            it(title, () => {
                const { doc: inputDoc, pos: inputPos } = parseCursor(prev);
                const view = createView(inputDoc, inputPos);

                const result = continueLists(view);

                const { doc: expectedDoc, pos: expectedPos } =
                    parseCursor(next);
                const actual = {
                    doc: view.state.doc.toString(),
                    pos: view.state.selection.main.anchor,
                    result,
                };
                const expectedObj = {
                    doc: expectedDoc,
                    pos: expectedPos,
                    result: !(
                        inputDoc === expectedDoc && inputPos === expectedPos
                    ),
                };
                expect(actual).toEqual(expectedObj);

                view.destroy();
            });
        });
    });
});

function createView(docText: string, head: number): EditorView {
    const state = EditorState.create({
        doc: docText,
        selection: { anchor: head },
        extensions: [keymap.of([])], // нужен хотя бы пустой keymap
    });
    return new EditorView({ state, parent: document.body });
}

function parseCursor(str: string): { doc: string; pos: number } {
    const idx = str.indexOf('|');
    if (idx < 0) {
        throw new Error(`Cursor '|' not found in "${str}"`);
    }
    const doc = str.slice(0, idx) + str.slice(idx + 1);
    return { doc, pos: idx };
}
