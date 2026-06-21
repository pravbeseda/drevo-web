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
const TRAILING_PUNCTUATION = /[.,;:!?)]+$/;

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
        const url = raw.replace(TRAILING_PUNCTUATION, '');
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
