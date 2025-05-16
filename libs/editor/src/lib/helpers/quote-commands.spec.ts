import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { handleQuote } from './quote-commands';

type QuoteChar = "'" | '"';

type TestCase = {
    title: string;
    input: string;
    expectedPattern: string; // use ^ as placeholder for the quote char
};

const testCases: TestCase[] = [
    { title: 'wrap selected text', input: '<text>', expectedPattern: '^text^' },
    {
        title: 'replace selected single quote',
        input: "<'>",
        expectedPattern: '^',
    },
    {
        title: 'replace selected double quote',
        input: '<">',
        expectedPattern: '^',
    },
    {
        title: 'strip single outer quotes',
        input: "<'text'>",
        expectedPattern: '^text^',
    },
    {
        title: 'strip double outer quotes',
        input: '<"text">',
        expectedPattern: '^text^',
    },
    {
        title: 'strip nested mixed quotes',
        input: `<"'nested'">`,
        expectedPattern: '^nested^',
    },
    {
        title: 'strip guillemets « »',
        input: '<«text»>',
        expectedPattern: '^text^',
    },
    {
        title: 'strip low-high quotes „ “',
        input: '<„text“>',
        expectedPattern: '^text^',
    },
    {
        title: 'strip double-prime quotes ‟ ”',
        input: '<‟text”>',
        expectedPattern: '^text^',
    },
];

describe.each(["'", '"'] as QuoteChar[])(
    'handleQuote with %s wrapper',
    wrapper => {
        afterEach(() => {
            document.body.innerHTML = '';
        });

        test.each(testCases)(
            'should $title → wrap with %s',
            ({ input, expectedPattern }) => {
                const { doc, from, to } = parseSelection(input);

                const view = new EditorView({
                    state: EditorState.create({
                        doc,
                        selection: { anchor: from, head: to },
                        extensions: [keymap.of([])],
                    }),
                    parent: document.body,
                });

                handleQuote(view, wrapper);
                const output = view.state.doc.toString();

                // Replace ^ placeholders with the actual quote character
                const expected = expectedPattern.replace(/\^/g, wrapper);

                expect(output).toBe(expected);

                view.destroy();
            }
        );
    }
);

/**
 * Parse a string with '<' and '>' markers.
 * Returns the document text, selection positions, and the raw selected substring.
 */
function parseSelection(str: string): {
    doc: string;
    from: number;
    to: number;
    selected: string;
} {
    const start = str.indexOf('<');
    const end = str.indexOf('>');
    if (start < 0 || end < 0 || end <= start) {
        throw new Error(`Invalid selection markers in: "${str}"`);
    }
    const selected = str.slice(start + 1, end);
    const doc = str.slice(0, start) + selected + str.slice(end + 1);
    return { doc, from: start, to: end - 1, selected };
}
