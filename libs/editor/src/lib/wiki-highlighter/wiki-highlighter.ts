import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { RangeSetBuilder, StateField } from '@codemirror/state';

const footnoteRegex = /\[\[([\s\S]*?)\]\]/g;
const linkRegex = /\(\((?!\()(.+?)(=.+?)?\)\)(?!\))/g;

interface Match {
    from: number;
    to: number;
    className: string;
}

const links: string[] = [];
const matches: Match[] = [];

export const wikiTheme = EditorView.theme({
    '.cm-footnote': {
        backgroundColor: '#f0f0f0',
        color: '#888',
    },
    '.cm-link': {
        backgroundColor: '#e0f7fa',
        color: '#007acc',
    },
    '.cm-link-pending': {
        backgroundColor: 'yellow',
    },
    '.cm-link-exists': {
        backgroundColor: 'green',
        color: '#fff',
    },
    '.cm-link-missing': {
        backgroundColor: 'red',
        color: '#fff',
    },
});

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

function createDecorations(text: string): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    matches.length = 0;

    collectMatches(text, footnoteRegex, 'cm-footnote');
    collectMatches(text, linkRegex, 'cm-link', true);
    collectLinksMatches(text);

    matches.sort((a, b) => a.from - b.from);

    for (const { from, to, className } of matches) {
        builder.add(from, to, Decoration.mark({ class: className }));
    }

    return builder.finish();
}

export function collectMatches(
    text: string,
    regex: RegExp,
    className: string,
    isBalancedCorrectionNeeded = false
): void {
    let match;
    while ((match = regex.exec(text)) !== null) {
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
}

function collectLinksMatches(text: string) {
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
        const matchedText = match[1];
        matches.push({
            from: match.index + 2,
            to: match.index + matchedText.length + 2,
            className: 'cm-link-pending',
        });
        links.push(match[1]); // Собираем текст ссылок
    }
}

function trimToBalanced(text: string): string {
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

    return text.slice(0, endIndex);
}
