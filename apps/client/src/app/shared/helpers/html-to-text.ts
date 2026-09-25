/** Closing block tags and line breaks, which glue words together once the tags are gone. */
const WORD_BOUNDARY = /<\/(?:p|div|li|blockquote|h[1-6]|td|th|tr)>|<br\s*\/?>/gi;

/**
 * The readable text of server-rendered HTML, on one line. The markup is parsed
 * into a fresh inert document rather than the page's own, so nothing in it runs
 * or loads — an `<img onerror>` would in a detached element of the live page.
 */
export function htmlToText(html: string, document: Document): string {
    const inert = document.implementation.createHTMLDocument('');
    inert.body.innerHTML = html.replace(WORD_BOUNDARY, ' $&');

    return inert.body.textContent.replace(/\s+/g, ' ').trim();
}
