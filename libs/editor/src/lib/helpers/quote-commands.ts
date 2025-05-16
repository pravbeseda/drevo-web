import { EditorSelection, SelectionRange } from '@codemirror/state';
import { EditorView, KeyBinding } from '@codemirror/view';

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
            replacement = quoteChar + quoteChar;
            cursorPos = from + 1;
        } else if (text === "'" || text === '"') {
            replacement = quoteChar;
            cursorPos = from + 1;
        } else {
            let inner = text;
            while (
                inner.length >= 2 &&
                (inner.startsWith("'") || inner.startsWith('"')) &&
                inner[0] === inner[inner.length - 1]
            ) {
                inner = inner.slice(1, -1);
            }
            if (inner !== text) {
                replacement = quoteChar + inner + quoteChar;
                cursorPos = from + replacement.length;
            } else {
                replacement = quoteChar + text + quoteChar;
                cursorPos = from + replacement.length;
            }
        }

        if (replacement !== text) didChange = true;
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

export const quoteKeymap: readonly KeyBinding[] = [
    { key: "'", run: view => handleQuote(view, "'") },
    { key: '"', run: view => handleQuote(view, '"') },
];
