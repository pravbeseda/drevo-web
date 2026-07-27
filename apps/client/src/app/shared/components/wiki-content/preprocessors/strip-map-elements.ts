// Scanned in a single pass rather than matched with one regex. A single pattern needs
// `[^>]*\sclass="map"[^>]*`, whose overlapping quantifiers sonarjs flags as
// super-linear; capping their length instead would silently stop stripping map
// elements that carry long attributes. Both sub-patterns below are unambiguous, so no
// cap is needed.
const OPEN_TAG = /<([a-z][\w-]*)(\s[^>]*)?>/gi;
const MAP_CLASS = /\sclass="map"/i;
const WHITESPACE_RE = /\s/;

/**
 * Remove every element carrying `class="map"`, together with its content.
 *
 * Well-formed markup only. A tag that is never terminated (`<abbr class="map"</div>>`)
 * is left in place rather than removed, because `OPEN_TAG` will not match across the
 * malformed boundary — the backend emits complete tags, and a browser parser would make
 * an equally arbitrary choice about such input.
 */
export function stripMapElements(html: string): string {
    let result = '';
    let cursor = 0;
    // Tag names already searched to the end of the document without a closer. If none
    // exists past one offset, none exists past a later one either, so repeating the
    // search for every unclosed map tag of that name would be quadratic.
    const unclosedNames = new Set<string>();

    OPEN_TAG.lastIndex = 0;
    for (let match = OPEN_TAG.exec(html); match; match = OPEN_TAG.exec(html)) {
        const attributes = match[2] ?? '';
        if (!MAP_CLASS.test(attributes)) {
            continue;
        }

        const tagName = match[1].toLowerCase();
        if (unclosedNames.has(tagName)) {
            continue;
        }

        const openTagEnd = match.index + match[0].length;
        // A trailing slash lands in the attribute group, since `/` is not `>`.
        const elementEnd = attributes.endsWith('/') ? openTagEnd : findClosingTagEnd(html, tagName, openTagEnd);

        // Unclosed and not self-closing: leave the markup untouched.
        if (elementEnd === undefined) {
            unclosedNames.add(tagName);
            continue;
        }

        result += html.slice(cursor, match.index);
        cursor = elementEnd;
        OPEN_TAG.lastIndex = cursor;
    }

    return result + html.slice(cursor);
}

/**
 * Offset just past the `</tagName>` closing `from`, or `undefined` when there is none.
 *
 * Offsets stay in `html` coordinates — searching a lowercased copy would shift them,
 * since lowercasing is not length-preserving (`U+0130` becomes two code units). Only the
 * short tag-name slice is folded for comparison.
 */
function findClosingTagEnd(html: string, tagName: string, from: number): number | undefined {
    const lowerName = tagName.toLowerCase();
    let search = from;

    for (;;) {
        const start = html.indexOf('</', search);
        if (start === -1) {
            return undefined;
        }

        const nameStart = start + 2;
        const nameEnd = nameStart + lowerName.length;
        // The name must match in full: `</abbr>` does not close `<a>`.
        if (html.slice(nameStart, nameEnd).toLowerCase() === lowerName && isNameBoundary(html[nameEnd])) {
            const end = html.indexOf('>', nameEnd);
            return end === -1 ? undefined : end + 1;
        }

        search = nameStart;
    }
}

function isNameBoundary(char: string | undefined): boolean {
    return char === undefined || char === '>' || char === '/' || WHITESPACE_RE.test(char);
}
