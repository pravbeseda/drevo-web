import { findAll } from './find-all';
import { maskLiteral } from '../mask';
import { RuleMatch, ValidationRule } from '../models/validation-rule.model';

const COMMENT_OPEN = '[*';
const COMMENT_CLOSE = '*]';

const EMPTY_MARKUP: readonly { readonly pattern: RegExp; readonly message: string }[] = [
    { pattern: /\(\(\s*\)\)/gu, message: 'Пустая ссылка (())' },
    { pattern: /\[\[\s*\]\]/gu, message: 'Пустая сноска [[]]' },
    { pattern: /\{\{\s*\}\}/gu, message: 'Пустая категория {{}}' },
];

export const emptyMarkup: ValidationRule = {
    id: 'empty-markup',
    defaultSeverity: 'warning',
    category: 'markup',
    validate(text: string): readonly RuleMatch[] {
        const masked = maskLiteral(text);
        return EMPTY_MARKUP.flatMap(({ pattern, message }) => findAll(masked, pattern, message));
    },
};

// Walks the comments the way CommentRule.php's lazy /\[\*.*?\*\]/s consumes them, left to right.
export const unclosedComment: ValidationRule = {
    id: 'unclosed-comment',
    defaultSeverity: 'error',
    category: 'markup',
    validate(text: string): readonly RuleMatch[] {
        const masked = maskLiteral(text);
        const matches: RuleMatch[] = [];
        let open = masked.indexOf(COMMENT_OPEN);

        while (open !== -1) {
            const close = masked.indexOf(COMMENT_CLOSE, open + COMMENT_OPEN.length);
            // With no `*]` after it, `[[*` is just a footnote opening with bold: nothing hides.
            if (close === -1) {
                if (masked[open - 1] !== '[')
                    matches.push({
                        from: open,
                        to: open + COMMENT_OPEN.length,
                        message: 'Комментарий [* не закрыт: нет *]',
                    });
                open = masked.indexOf(COMMENT_OPEN, open + COMMENT_OPEN.length);
                continue;
            }

            if (masked[open - 1] === '[') {
                matches.push({
                    from: open - 1,
                    to: open + COMMENT_OPEN.length,
                    message: '[[* читается как начало комментария [* … *] — сноска скроется',
                    suggestion: '[[ *',
                });
            } else if (masked.slice(open + COMMENT_OPEN.length, close).includes(COMMENT_OPEN)) {
                matches.push({
                    from: open,
                    to: open + COMMENT_OPEN.length,
                    message: 'Комментарий [* закрывается только после следующего [* — текст между ними скроется',
                });
            }
            open = masked.indexOf(COMMENT_OPEN, close + COMMENT_CLOSE.length);
        }

        return matches;
    },
};
