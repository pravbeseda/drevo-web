import { Extension, Prec } from '@codemirror/state';
import { keymap, placeholder } from '@codemirror/view';

/** The shortcut that sends a forum message, in CodeMirror's notation. */
export const FORUM_SEND_KEY = 'Mod-Enter';

/**
 * What the forum's editor adds to the wiki one: a hint in the empty field and
 * Ctrl/⌘+Enter to send — ahead of the editor's own Enter, which continues lists.
 */
export function forumEditorExtensions(hint: string, submit: () => void): Extension[] {
    return [
        placeholder(hint),
        Prec.highest(
            keymap.of([
                {
                    key: FORUM_SEND_KEY,
                    run: () => {
                        submit();
                        return true;
                    },
                },
            ]),
        ),
    ];
}
