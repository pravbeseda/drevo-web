/** Closing block tags and line breaks, which glue words together once the tags are gone. */
const WORD_BOUNDARY = /<\/(?:p|div|li|blockquote|h[1-6]|td|th|tr)>|<br\s*\/?>/gi;

/** Stands in for a boundary while the markup's own whitespace is collapsed around it. */
const LINE_MARK = ' ';

/**
 * The readable text of server-rendered HTML, on one line. The markup is parsed
 * into a fresh inert document rather than the page's own, so nothing in it runs
 * or loads — an `<img onerror>` would in a detached element of the live page.
 */
export function htmlToText(html: string, document: Document): string {
    return readText(html.replace(WORD_BOUNDARY, ' $&'), document).replace(/\s+/g, ' ').trim();
}

/** The same text with a line per block and per `<br>` — what a quote of the message is made of. */
export function htmlToLines(html: string, document: Document): string {
    return readText(html.replace(WORD_BOUNDARY, `${LINE_MARK}$&`), document)
        .split(LINE_MARK)
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(line => line.length > 0)
        .join('\n');
}

function readText(html: string, document: Document): string {
    const inert = document.implementation.createHTMLDocument('');
    inert.body.innerHTML = html;

    return inert.body.textContent;
}
