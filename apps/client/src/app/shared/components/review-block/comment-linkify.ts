/**
 * A piece of a review comment: either plain text or an http(s) link. Splitting
 * up front lets the template render links declaratively (with Angular escaping
 * the text) instead of binding raw HTML.
 */
export interface CommentSegment {
    readonly text: string;
    readonly href?: string;
}

const URL_REGEX = /https?:\/\/[^\s<]+/gi;
const TRAILING_SENTENCE_PUNCTUATION = '.,;:!?';

/**
 * Trim trailing sentence punctuation from a matched URL. A closing `)` is only
 * treated as punctuation when it has no matching `(` inside the URL, so balanced
 * links (e.g. `.../Москва_(значения)`) keep their bracket.
 */
function trimTrailingPunctuation(raw: string): string {
    let url = raw;
    while (url.length > 0) {
        const last = url[url.length - 1];
        if (last === ')') {
            const opens = (url.match(/\(/g) ?? []).length;
            const closes = (url.match(/\)/g) ?? []).length;
            if (closes <= opens) {
                break;
            }
        } else if (!TRAILING_SENTENCE_PUNCTUATION.includes(last)) {
            break;
        }
        url = url.slice(0, -1);
    }
    return url;
}

/**
 * Split a comment into text/link segments. Only http(s) URLs become links;
 * trailing sentence punctuation is kept as plain text (mirrors the legacy
 * `renderComment`).
 */
export function linkifyComment(text: string): readonly CommentSegment[] {
    const segments: CommentSegment[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(URL_REGEX)) {
        const start = match.index ?? 0;
        const raw = match[0];
        const url = trimTrailingPunctuation(raw);
        const tail = raw.slice(url.length);

        if (start > lastIndex) {
            segments.push({ text: text.slice(lastIndex, start) });
        }
        segments.push({ text: url, href: url });
        if (tail.length > 0) {
            segments.push({ text: tail });
        }
        lastIndex = start + raw.length;
    }

    if (lastIndex < text.length) {
        segments.push({ text: text.slice(lastIndex) });
    }

    return segments;
}
