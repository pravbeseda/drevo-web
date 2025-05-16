import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { handleQuote } from './quote-commands';

type QuoteChar = "'" | '"';

type TestCase = {
    title: string;
    input: string;
    key: QuoteChar;
    expected: string;
};

const testCases: TestCase[] = [
    {
        title: 'should wrap selected text with single quotes',
        input: '<text>',
        key: "'",
        expected: "'text'",
    },
    {
        title: 'should wrap selected text with double quotes',
        input: '<text>',
        key: '"',
        expected: '"text"',
    },
    {
        title: 'should replace selected single quote with double quote',
        input: "<'>",
        key: '"',
        expected: '"',
    },
    {
        title: 'should replace selected double quote with single quote',
        input: '<">',
        key: "'",
        expected: "'",
    },
    {
        title: 'should strip single outer quotes and wrap with double quotes',
        input: "<'text'>",
        key: '"',
        expected: '"text"',
    },
    {
        title: 'should strip double outer quotes and wrap with single quotes',
        input: '<"text">',
        key: "'",
        expected: "'text'",
    },
    {
        title: 'should strip nested mixed quotes and wrap with single quotes',
        input: `<"'nested'">`,
        key: "'",
        expected: "'nested'",
    },
];

describe('handleQuote', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test.each(testCases)('$title', ({ input, key, expected }) => {
        const { doc, from, to } = parseSelection(input);

        const view = new EditorView({
            state: EditorState.create({
                doc,
                selection: { anchor: from, head: to },
                extensions: [keymap.of([])],
            }),
            parent: document.body,
        });

        handleQuote(view, key);
        const output = view.state.doc.toString();

        expect(output).toBe(expected);

        view.destroy();
    });
});

/**
 * Parse a string with '<' and '>' markers.
 * Returns the clean document text and selection positions.
 */
function parseSelection(str: string): {
    doc: string;
    from: number;
    to: number;
} {
    const start = str.indexOf('<');
    const end = str.indexOf('>');
    if (start < 0 || end < 0 || end <= start) {
        throw new Error(`Invalid selection markers in: "${str}"`);
    }
    const selectedText = str.slice(start + 1, end);
    const doc = str.slice(0, start) + selectedText + str.slice(end + 1);
    return { doc, from: start, to: end - 1 };
}
