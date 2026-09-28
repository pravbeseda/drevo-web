import { Extension, Prec } from '@codemirror/state';
import { keymap, placeholder } from '@codemirror/view';

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
                    key: 'Mod-Enter',
                    run: () => {
                        submit();
                        return true;
                    },
                },
            ]),
        ),
    ];
}
