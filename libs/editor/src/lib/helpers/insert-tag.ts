import { EditorView } from '@codemirror/view';
import { InsertTagCommand } from '@drevo-web/shared';

export function insertTagInView(view: EditorView, command: InsertTagCommand): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;
    const selectedText = from === to ? command.sampleText : state.doc.sliceString(from, to);
    const taggedText = `${command.tagOpen}${selectedText}${command.tagClose}`;

    view.dispatch({
        changes: { from, to, insert: taggedText },
        selection: {
            anchor: from + command.tagOpen.length,
            head: from + command.tagOpen.length + selectedText.length,
        },
    });

    view.focus();
    return true;
}
