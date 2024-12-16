import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { RangeSetBuilder, StateField } from '@codemirror/state';
import { footnoteRegex, linkRegex } from './wiki-highlightRegex';

interface Match {
    from: number;
    to: number;
    className: string;
}

export const wikiTheme = EditorView.theme({
    '.cm-footnote': {
        backgroundColor: '#f0f0f0',
        color: '#888',
    },
    '.cm-link': {
        backgroundColor: '#e0f7fa',
        color: '#007acc',
    },
});

function createDecorations(doc: string): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const matches: Match[] = [];

    const collectMatches = (
        regex: RegExp,
        className: string,
        isBalancedCorrectionNeeded?: boolean
    ) => {
        let match;
        while ((match = regex.exec(doc)) !== null) {
            let matchedText = match[0];
            if (isBalancedCorrectionNeeded) {
                matchedText = trimToBalanced(matchedText);
            }

            matches.push({
                from: match.index,
                to: match.index + matchedText.length,
                className,
            });
        }
    };

    const trimToBalanced = (text: string): string => {
        let stack = 0;
        let endIndex = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '(') {
                stack++;
            } else if (char === ')') {
                stack--;
            }
            if (stack < 0) {
                break;
            }
            endIndex = i + 1;
        }

        return stack === 0 ? text.slice(0, endIndex) : text.slice(0, endIndex);
    };

    collectMatches(footnoteRegex, 'cm-footnote');
    collectMatches(linkRegex, 'cm-link', true);

    matches.sort((a, b) => a.from - b.from);

    for (const { from, to, className } of matches) {
        builder.add(from, to, Decoration.mark({ class: className }));
    }

    return builder.finish();
}

export const wikiHighlighter = StateField.define<DecorationSet>({
    create(state) {
        return createDecorations(state.doc.toString());
    },
    update(decorations, transaction) {
        if (transaction.docChanged) {
            return createDecorations(transaction.newDoc.toString());
        }
        return decorations;
    },
    provide: f => EditorView.decorations.from(f),
});
