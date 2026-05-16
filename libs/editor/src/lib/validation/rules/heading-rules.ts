import {
    WIKI_BOLD_REGEX,
    WIKI_FOOTNOTE_REGEX,
    WIKI_HEADING_REGEX,
    WIKI_ITALIC_REGEX,
    WIKI_LINK_REGEX,
} from '../constants/wiki-patterns';
import { RuleMatch, ValidationRule } from '../models/validation-rule.model';

function findInHeadings(text: string, pattern: RegExp, message: string): readonly RuleMatch[] {
    const matches: RuleMatch[] = [];

    for (const headingMatch of text.matchAll(WIKI_HEADING_REGEX)) {
        const content = headingMatch[1] ?? headingMatch[2];
        const markerLen = headingMatch[1] ? 3 : 2;
        const contentStart = headingMatch.index + markerLen;

        for (const innerMatch of content.matchAll(pattern)) {
            matches.push({
                from: contentStart + innerMatch.index,
                to: contentStart + innerMatch.index + innerMatch[0].length,
                message,
            });
        }
    }

    return matches;
}

export const headingNoLinks: ValidationRule = {
    id: 'heading-no-links',
    defaultSeverity: 'warning',
    validate(text: string): readonly RuleMatch[] {
        return findInHeadings(text, WIKI_LINK_REGEX, 'Ссылки запрещены в заголовках');
    },
};

export const headingNoFormatting: ValidationRule = {
    id: 'heading-no-formatting',
    defaultSeverity: 'warning',
    validate(text: string): readonly RuleMatch[] {
        return [
            ...findInHeadings(text, WIKI_BOLD_REGEX, 'Жирный текст запрещён в заголовках'),
            ...findInHeadings(text, WIKI_ITALIC_REGEX, 'Курсив запрещён в заголовках'),
        ];
    },
};

export const headingNoFootnotes: ValidationRule = {
    id: 'heading-no-footnotes',
    defaultSeverity: 'warning',
    validate(text: string): readonly RuleMatch[] {
        return findInHeadings(text, WIKI_FOOTNOTE_REGEX, 'Сноски запрещены в заголовках');
    },
};
