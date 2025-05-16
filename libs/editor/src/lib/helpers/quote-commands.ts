import { EditorSelection, SelectionRange } from '@codemirror/state';
import { EditorView, KeyBinding } from '@codemirror/view';

/** All supported quote pairs and their characters */
const outerPairs: [string, string][] = [
    ["'", "'"],
    ['"', '"'],
    ['«', '»'],
    ['„', '“'],
    ['‟', '”'],
];

const allQuoteChars = new Set(
    outerPairs.flatMap(([open, close]) => [open, close])
);

/**
 * Handle a quote key press:
 * - empty selection → insert two quoteChar and place cursor between
 * - single‐char selection of any supported quote → replace with quoteChar
 * - selection wrapped in any supported pair(s) → strip all outer layers, then wrap with quoteChar
 * - otherwise → wrap selection with quoteChar
 */
export function handleQuote(view: EditorView, quoteChar: "'" | '"'): boolean {
    const { state } = view;
    const changes: { from: number; to: number; insert: string }[] = [];
    const newRanges: SelectionRange[] = [];
    let didChange = false;

    for (const range of state.selection.ranges) {
        const { from, to } = range;
        const text = state.sliceDoc(from, to);
        let replacement: string;
        let cursorPos: number;

        if (from === to) {
            // no selection: insert a pair and place cursor in between
            replacement = quoteChar + quoteChar;
            cursorPos = from + 1;
        } else if (text.length === 1 && allQuoteChars.has(text)) {
            // single‐char selection of any supported quote: replace it
            replacement = quoteChar;
            cursorPos = from + 1;
        } else {
            // strip all matching outer pairs
            let inner = text;
            let stripped: boolean;
            do {
                stripped = false;
                for (const [open, close] of outerPairs) {
                    if (inner.startsWith(open) && inner.endsWith(close)) {
                        inner = inner.slice(
                            open.length,
                            inner.length - close.length
                        );
                        stripped = true;
                        break;
                    }
                }
            } while (stripped);

            // now wrap stripped or original text
            replacement = quoteChar + inner + quoteChar;
            cursorPos = from + replacement.length;
        }

        if (replacement !== text) {
            didChange = true;
        }
        changes.push({ from, to, insert: replacement });
        newRanges.push(EditorSelection.cursor(cursorPos));
    }

    if (!didChange) return false;

    view.dispatch({
        changes,
        selection: EditorSelection.create(newRanges),
    });
    return true;
}

/** Only bind the two keys, the rest is handled in handleQuote */
export const quoteKeymap: readonly KeyBinding[] = [
    { key: "'", run: view => handleQuote(view, "'") },
    { key: '"', run: view => handleQuote(view, '"') },
];
