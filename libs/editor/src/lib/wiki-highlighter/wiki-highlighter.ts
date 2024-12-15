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

    const collectMatches = (regex: RegExp, className: string) => {
        let match;
        while ((match = regex.exec(doc)) !== null) {
            matches.push({
                from: match.index,
                to: match.index + match[0].length,
                className,
            });
        }
    };

    // Собираем все совпадения для каждого регулярного выражения
    collectMatches(footnoteRegex, 'cm-footnote');
    collectMatches(linkRegex, 'cm-link');

    // Сортируем совпадения по позиции 'from'
    matches.sort((a, b) => a.from - b.from);

    // Добавляем отсортированные диапазоны в builder
    for (const { from, to, className } of matches) {
        builder.add(from, to, Decoration.mark({ class: className }));
    }

    return builder.finish();
}

// Поле состояния для хранения декораций
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
