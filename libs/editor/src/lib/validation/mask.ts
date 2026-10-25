import {
    WIKI_COMMENT_REGEX,
    WIKI_INLINE_CODE_REGEX,
    WIKI_NOWIKI_REGEX,
    WIKI_URL_REGEX,
} from './constants/wiki-patterns';

// A non-letter, non-space filler: a masked span must neither join two words nor read as whitespace between them.
export const MASK_FILLER = '\u0000';

const LITERAL_PATTERNS: readonly RegExp[] = [WIKI_INLINE_CODE_REGEX, WIKI_NOWIKI_REGEX];
const NON_PROSE_PATTERNS: readonly RegExp[] = [...LITERAL_PATTERNS, WIKI_COMMENT_REGEX, WIKI_URL_REGEX];

// Masking keeps the length and the line breaks, so offsets found in the result point into the original text.
function mask(text: string, patterns: readonly RegExp[]): string {
    return patterns.reduce(
        (masked, pattern) => masked.replace(pattern, span => span.replace(/[^\n]/gu, MASK_FILLER)),
        text,
    );
}

/** Blanks what the formatter takes literally: inline code and `<nowiki>`. */
export function maskLiteral(text: string): string {
    return mask(text, LITERAL_PATTERNS);
}

/** Blanks everything a reader does not see as prose: literal spans, comments, URLs. */
export function maskNonProse(text: string): string {
    return mask(text, NON_PROSE_PATTERNS);
}
