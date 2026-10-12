/** Blocks whose edges glue words together once the tags are gone. */
const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'TR']);

/** What the formatter wraps the `>` lines of the source in, one per level. */
const QUOTE_SELECTOR = 'blockquote.quote';

interface TextLine {
    readonly depth: number;
    readonly text: string;
}

/** The readable text of server-rendered HTML, on one line. */
export function htmlToText(html: string, document: Document): string {
    return readLines(html, document)
        .map(line => line.text)
        .join(' ');
}

/**
 * The text as the forum's source writes it: a line per block and per `<br>`,
 * and a quoted line led by one `> ` per level of quote around it.
 */
export function htmlToLines(html: string, document: Document): string {
    return readLines(html, document)
        .map(line => '> '.repeat(line.depth) + line.text)
        .join('\n');
}

/**
 * The lines of the HTML with the quote level of each. The markup is parsed into a
 * fresh inert document rather than the page's own, so nothing in it runs or
 * loads — an `<img onerror>` would in a detached element of the live page.
 */
function readLines(html: string, document: Document): readonly TextLine[] {
    const inert = document.implementation.createHTMLDocument('');
    inert.body.innerHTML = html;

    const lines: TextLine[] = [];
    let current = '';
    let currentDepth = 0;

    const breakLine = (): void => {
        const text = current.replace(/\s+/g, ' ').trim();
        if (text) {
            lines.push({ depth: currentDepth, text });
        }
        current = '';
    };

    const visit = (node: Node, depth: number): void => {
        if (node.nodeType === node.TEXT_NODE) {
            // A quote keeps its source lines apart, as it shows them; elsewhere a newline is formatting.
            const text = node.textContent ?? '';
            const parts = depth > 0 ? text.split('\n') : [text];
            currentDepth = depth;
            parts.forEach((part, index) => {
                if (index > 0) {
                    breakLine();
                }
                current += part;
            });
            return;
        }
        if (!isElement(node)) {
            return;
        }
        if (node.tagName === 'BR') {
            breakLine();
            return;
        }
        const isBlock = BLOCK_TAGS.has(node.tagName);
        const childDepth = node.matches(QUOTE_SELECTOR) ? depth + 1 : depth;
        if (isBlock) {
            breakLine();
        }
        node.childNodes.forEach(child => visit(child, childDepth));
        if (isBlock) {
            breakLine();
        }
    };

    visit(inert.body, 0);
    breakLine();

    return lines;
}

/** The node's own constants, not the global `Node`, which the server render does not have. */
function isElement(node: Node): node is Element {
    return node.nodeType === node.ELEMENT_NODE;
}
