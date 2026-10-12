/** A quote keeps the message and what it quoted; anything older is dropped, so quotes do not pile up down a thread. */
const MAX_QUOTE_DEPTH = 2;

/** The `>` markers that open a line, with the blanks around them. */
const QUOTE_MARKERS = /^(?:>[ \t]*)+/;

/**
 * The text as the forum quotes it: each line that has text starts with `> `,
 * its leading blanks dropped — `ForumUtil::makeQuote`, except that a blank
 * line stays, where the legacy `\s*` runs across it, and that a line which
 * would go deeper than `MAX_QUOTE_DEPTH` is left out.
 */
export function quoteForumText(text: string): string {
    return text
        .split('\n')
        .filter(line => quoteDepth(line) < MAX_QUOTE_DEPTH)
        .map(line => {
            const content = line.trimStart();
            return content ? `> ${content}` : line;
        })
        .join('\n');
}

function quoteDepth(line: string): number {
    const markers = QUOTE_MARKERS.exec(line.trimStart())?.[0] ?? '';
    return markers.split('>').length - 1;
}
