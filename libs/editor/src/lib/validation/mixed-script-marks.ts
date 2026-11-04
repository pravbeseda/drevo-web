import { findMixedScriptWords, isScriptLetter, Script } from './mixed-script-words';
import { EditorState, Extension, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, hoverTooltip, Tooltip } from '@codemirror/view';

export interface MixedScriptHint {
    readonly from: number;
    readonly to: number;
    readonly message: string;
}

const HINT: Readonly<Record<Script, (letter: string) => string>> = {
    latin: letter => `Латинская «${letter}» среди кириллицы`,
    cyrillic: letter => `Кириллическая «${letter}» среди латиницы`,
};
const HOVER_DELAY_MS = 100;

const letterMark = Decoration.mark({
    class: 'cm-mixed-script-letter',
    attributes: { 'data-testid': 'mixed-script-letter' },
});

function buildMarks(text: string): DecorationSet {
    const marks: Range<Decoration>[] = [];
    for (const { from, text: word, minority } of findMixedScriptWords(text)) {
        let pos = from;
        for (const letter of word) {
            if (isScriptLetter(letter, minority)) {
                marks.push(letterMark.range(pos, pos + letter.length));
            }
            pos += letter.length;
        }
    }
    return Decoration.set(marks);
}

// shortcut: rescans the whole document on every edit (~10 ms at 300K characters), as the wiki highlighter does; rescan only the changed lines if long articles lag.
const marksField = StateField.define<DecorationSet>({
    create: state => buildMarks(state.doc.toString()),
    update: (marks, tr) => (tr.docChanged ? buildMarks(tr.newDoc.toString()) : marks),
    provide: field => EditorView.decorations.from(field),
});

/** The marked letter under the pointer: `side` tells which side of `pos` the pointer is on, as `hoverTooltip` passes it. */
export function mixedScriptHintAt(state: EditorState, pos: number, side: -1 | 1): MixedScriptHint | undefined {
    let hint: MixedScriptHint | undefined;
    state.field(marksField).between(pos, pos, (from, to) => {
        const covers = side < 0 ? from < pos : to > pos;
        if (!covers) return;
        const letter = state.sliceDoc(from, to);
        hint = { from, to, message: HINT[isScriptLetter(letter, 'latin') ? 'latin' : 'cyrillic'](letter) };
        return false;
    });
    return hint;
}

function createHintDom(view: EditorView, message: string): HTMLElement {
    const dom = view.dom.ownerDocument.createElement('div');
    dom.className = 'cm-mixed-script-tooltip';
    dom.dataset['testid'] = 'mixed-script-hint';
    dom.textContent = message;
    return dom;
}

const hintTooltip = hoverTooltip(
    (view, pos, side): Tooltip | null => {
        const hint = mixedScriptHintAt(view.state, pos, side);
        // eslint-disable-next-line no-null/no-null -- hoverTooltip's contract for "no tooltip here"
        if (!hint) return null;
        return {
            pos: hint.from,
            end: hint.to,
            above: true,
            create: tooltipView => ({ dom: createHintDom(tooltipView, hint.message) }),
        };
    },
    { hoverTime: HOVER_DELAY_MS },
);

/** Outlines the letters of the minority alphabet in a word that mixes Latin and Cyrillic, with a hint on hover. */
export const mixedScriptMarks: Extension = [marksField, hintTooltip];
