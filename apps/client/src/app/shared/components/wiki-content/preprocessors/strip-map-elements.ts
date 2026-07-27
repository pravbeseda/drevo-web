// Scanned in a single pass rather than matched with one regex. A single pattern needs
// `[^>]*\sclass="map"[^>]*`, whose overlapping quantifiers sonarjs flags as
// super-linear; capping their length instead would silently stop stripping map
// elements that carry long attributes. Both sub-patterns below are unambiguous, so no
// cap is needed.
const OPEN_TAG = /<([a-z][\w-]*)(\s[^>]*)?>/gi;
const MAP_CLASS = /\sclass="map"/i;

/** Remove every element carrying `class="map"`, together with its content. */
export function stripMapElements(html: string): string {
    const lowerHtml = html.toLowerCase();
    let result = '';
    let cursor = 0;

    OPEN_TAG.lastIndex = 0;
    for (let match = OPEN_TAG.exec(html); match; match = OPEN_TAG.exec(html)) {
        const attributes = match[2] ?? '';
        if (!MAP_CLASS.test(attributes)) {
            continue;
        }

        const openTagEnd = match.index + match[0].length;
        // A trailing slash lands in the attribute group, since `/` is not `>`.
        const elementEnd = attributes.endsWith('/') ? openTagEnd : findClosingTagEnd(lowerHtml, match[1], openTagEnd);

        // Unclosed and not self-closing: leave the markup untouched.
        if (elementEnd === undefined) {
            continue;
        }

        result += html.slice(cursor, match.index);
        cursor = elementEnd;
        OPEN_TAG.lastIndex = cursor;
    }

    return result + html.slice(cursor);
}

function findClosingTagEnd(lowerHtml: string, tagName: string, from: number): number | undefined {
    const start = lowerHtml.indexOf(`</${tagName.toLowerCase()}`, from);
    if (start === -1) {
        return undefined;
    }

    const end = lowerHtml.indexOf('>', start);
    return end === -1 ? undefined : end + 1;
}
