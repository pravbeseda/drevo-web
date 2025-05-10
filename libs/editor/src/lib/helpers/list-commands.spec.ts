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
                prev: '* *hello*|   world ',
                next: '* *hello*\n* |world',
            },
            {
                title: 'should continue list',
                prev: '* item|',
                next: '* item\n* |',
            },
            {
                title: 'should continue list level2',
                prev: '** item|',
                next: '** item\n** |',
            },
            {
                title: 'should continue numbered list',
                prev: '# item|',
                next: '# item\n# |',
            },
            {
                title: 'should continue numbered list level2',
                prev: '## item|',
                next: '## item\n## |',
            },
            {
                title: 'should continue mixed list level2',
                prev: '*# item|',
                next: '*# item\n*# |',
            },
            {
                title: 'should skip list after empy item',
                prev: '*|',
                next: '\n|',
            },
            {
                title: 'should not handle when cursor at the beginning of line',
                prev: '|* item',
                next: '|* item',
            },
            // comments tests
            {
                title: 'should break comment',
                prev: '> word1| word2',
                next: '> word1\n\n|\n\n> word2',
            },
            {
                title: 'should add empty string',
                prev: '> word1 word2|',
                next: '> word1 word2\n\n|',
            },
            {
                title: 'should not handle when cursor at the beginning of quote mark',
                prev: '|> word1 word2',
                next: '|> word1 word2',
            },
        ];

        continueCases.forEach(({ title, prev, next }) => {
            it(title, () => {
                const { doc: inputDoc, pos: inputPos } = parseCursor(prev);
                const view = createView(inputDoc, inputPos);

                const result = continueLists(view);

                const { doc: expectedDoc, pos: expectedPos } =
                    parseCursor(next);
                // Serialize doc with visible newline markers for easier diffing
                const rawActualDoc = view.state.doc.toString();
                const actual = {
                    doc: rawActualDoc,
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
