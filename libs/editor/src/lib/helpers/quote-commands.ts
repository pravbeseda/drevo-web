import { EditorSelection, SelectionRange } from '@codemirror/state';
import { EditorView, KeyBinding } from '@codemirror/view';

/** All supported quote pairs for stripping */
const outerPairs: [string, string][] = [
    ["'", "'"],
    ['"', '"'],
    ['«', '»'],
    ['„', '“'],
    ['‟', '”'],
];

/** Flattened set of all individual quote chars */
const allQuoteChars = new Set(
    outerPairs.flatMap(([open, close]) => [open, close])
);

/**
 * Handle a quote key press **only when there is a non-empty selection**:
 * - single-char selection of any supported quote → replace with quoteChar
 * - selection wrapped in any supported pair(s) → strip all layers, then wrap with quoteChar
 * - otherwise → wrap selection with quoteChar
 *
 * If there is no selection (cursor only), do nothing and allow default behavior.
 */
export function handleQuote(view: EditorView, quoteChar: "'" | '"'): boolean {
    const { state } = view;
    // collect only ranges that actually have text selected
    const ranges = state.selection.ranges.filter(r => !r.empty);
    if (ranges.length === 0) {
        // no non-empty selection: do not handle
        return false;
    }

    const changes: { from: number; to: number; insert: string }[] = [];
    const newRanges: SelectionRange[] = [];
    let didChange = false;

    for (const { from, to } of ranges) {
        const text = state.sliceDoc(from, to);
        let replacement: string;
        let cursorPos: number;

        if (text.length === 1 && allQuoteChars.has(text)) {
            // replace a single existing quote
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

            // wrap the stripped (or original) text
            replacement = quoteChar + inner + quoteChar;
            cursorPos = from + replacement.length;
        }

        if (replacement !== text) {
            didChange = true;
        }
        changes.push({ from, to, insert: replacement });
        newRanges.push(EditorSelection.cursor(cursorPos));
    }

    if (!didChange) {
        return false;
    }

    view.dispatch({
        changes,
        selection: EditorSelection.create(newRanges),
    });
    return true;
}

/** Bind only the two quote keys; default behavior applies when no selection */
export const quoteKeymap: readonly KeyBinding[] = [
    { key: "'", run: view => handleQuote(view, "'") },
    { key: '"', run: view => handleQuote(view, '"') },
];
