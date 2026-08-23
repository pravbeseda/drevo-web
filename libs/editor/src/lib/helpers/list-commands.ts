import { Line } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const LIST_PREFIX_RE = /^([*#]+)(\s*)/;
const QUOTE_PREFIX_RE = /^>\s*/;

interface PrefixChange {
    readonly from: number;
    readonly to: number;
    readonly insert: string;
}

/** Returns the new list prefix, or `undefined` when the line must stay untouched. */
type PrefixTransform = (prefix: string) => string | undefined;

export function continueLists(view: EditorView): boolean {
    return handleQuoteContinuation(view) || handleListContinuation(view);
}

function buildPrefixChange(line: Line, transform: PrefixTransform): PrefixChange | undefined {
    const match = LIST_PREFIX_RE.exec(line.text);
    if (!match) {
        return undefined;
    }

    const newPrefix = transform(match[1]);
    if (newPrefix === undefined) {
        return undefined;
    }

    return {
        from: line.from,
        to: line.from + match[0].length,
        insert: newPrefix + match[2],
    };
}

/** Apply `transform` to every selected list line, falling back to the cursor line. */
function applyPrefixTransform(view: EditorView, transform: PrefixTransform): boolean {
    const { doc, selection } = view.state;
    const startLine = doc.lineAt(selection.main.from);
    const endLine = doc.lineAt(selection.main.to);

    if (startLine.number !== endLine.number) {
        const changes: PrefixChange[] = [];
        for (let i = startLine.number; i <= endLine.number; i++) {
            const change = buildPrefixChange(doc.line(i), transform);
            if (change) {
                changes.push(change);
            }
        }

        if (changes.length > 0) {
            view.dispatch({ changes });
            return true;
        }
    }

    const change = buildPrefixChange(doc.lineAt(selection.main.head), transform);
    if (!change) {
        return false;
    }

    view.dispatch({ changes: change });
    return true;
}

export function increaseListIndent(view: EditorView): boolean {
    // Deepen by repeating the last marker char, so the list type is preserved.
    return applyPrefixTransform(view, prefix => prefix + prefix[prefix.length - 1]);
}

export function decreaseListIndent(view: EditorView): boolean {
    return applyPrefixTransform(view, prefix => (prefix.length > 1 ? prefix.slice(0, -1) : undefined));
}

function handleListContinuation(view: EditorView): boolean {
    const { state } = view;
    const { doc } = state;
    const head = state.selection.main.head;
    const line = doc.lineAt(head);
    const lineContent = line.text;

    // Do not handle when cursor at the beginning of a line
    if (head === line.from) {
        return false;
    }

    const listMatch = LIST_PREFIX_RE.exec(lineContent);

    if (!listMatch) return false;

    const symbolPrefix = listMatch[1]; // sequence of '*' or '#'
    // If single '*' and total '*' count is even, skip (likely bold syntax)
    if (symbolPrefix === '*') {
        const totalStars = (lineContent.match(/\*/g) || []).length;
        if (totalStars % 2 === 0) {
            return false;
        }
    }

    // Form the correct prefix with a guaranteed space
    const correctPrefix = symbolPrefix + ' ';

    // If the line contains only prefix and whitespace, remove the prefix
    if (lineContent.trim() === symbolPrefix.trim()) {
        // Remove prefix and insert an empty line before cursor
        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: '\n',
            },
            selection: { anchor: line.from + 1 }, // Position cursor after the empty line
        });
        return true;
    }

    // Insert a new line with the full prefix (guarantee a space)
    const reminder = lineContent.substring(head - line.from);
    const trimmedReminder = reminder.trim();

    view.dispatch({
        changes: {
            from: head,
            to: line.to,
            insert: '\n' + correctPrefix + trimmedReminder,
        },
        selection: { anchor: head + 1 + correctPrefix.length },
    });
    return true;
}

function handleQuoteContinuation(view: EditorView): boolean {
    const { state } = view;
    const { doc } = state;
    const { head } = state.selection.main;

    // Get the current line
    const line = doc.lineAt(head);
    const lineContent = line.text;

    // Do not handle when cursor at the beginning of a line
    if (head === line.from) {
        return false;
    }

    // Check if the line starts with a quote character ">"
    const quoteMatch = QUOTE_PREFIX_RE.exec(lineContent);

    if (!quoteMatch) return false;

    // Special handling for quote character ">"
    const prefix = quoteMatch[0];
    const remainingContent = lineContent.substring(head - line.from).trim();
    const isCursorAtEndOfLine = head === line.to;

    let insertText;
    const cursorPos = head + 2; // Position after first \n\n

    if (isCursorAtEndOfLine) {
        // If cursor is at the end of line, just insert two lines
        // One empty line and one for cursor
        insertText = '\n\n';
    } else {
        // Format: Empty line + cursor line + empty lines + (optional) remaining text with prefix
        insertText = '\n\n\n\n'; // Four lines: before cursor, cursor line, two empty lines after

        // Add remaining text with prefix
        if (remainingContent.trim().length > 0) {
            insertText += prefix + remainingContent;
        }
    }

    view.dispatch({
        changes: {
            from: head,
            to: line.to,
            insert: insertText,
        },
        selection: { anchor: cursorPos }, // Place cursor on the second line
    });
    return true;
}
