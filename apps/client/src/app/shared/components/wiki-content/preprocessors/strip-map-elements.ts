import { optionalGroup } from '@drevo-web/shared';

// Scanned in a single pass rather than matched with one regex. A single pattern needs
// `[^>]*\sclass="map"[^>]*`, whose overlapping quantifiers sonarjs flags as
// super-linear; capping their length instead would silently stop stripping map
// elements that carry long attributes. Both sub-patterns below are unambiguous, so no
// cap is needed.
const ANY_TAG = /<(\/?)([a-z][\w-]*)(\s[^>]*)?>/gi;
const MAP_CLASS = /\sclass="map"/i;

interface TagSpan {
    readonly start: number;
    readonly end: number;
}

/**
 * Remove every element carrying `class="map"`, together with its content.
 *
 * Well-formed markup only. A tag that is never terminated (`<abbr class="map"</div>>`)
 * is left in place rather than removed, because `ANY_TAG` will not match across the
 * malformed boundary — the backend emits complete tags, and a browser parser would make
 * an equally arbitrary choice about such input.
 */
export function stripMapElements(html: string): string {
    const elements = [...findMapElements(html)].sort((a, b) => a.start - b.start);

    let result = '';
    let cursor = 0;

    for (const { start, end } of elements) {
        // Nested inside an element already removed, so its markup is gone with the parent.
        if (start < cursor) {
            continue;
        }
        result += html.slice(cursor, start);
        cursor = end;
    }

    return result + html.slice(cursor);
}

/**
 * Spans of every map element, paired with the closing tag that balances it.
 *
 * One stack per tag name rather than one shared stack: unbalanced markup then stays local,
 * so `<div><p></div></p>` still pairs each name with its own closer instead of discarding
 * the rest of the document. Pairing by depth is what keeps a nested same-name element from
 * ending the span early — a stray `</div>` reaching `bypassSecurityTrustHtml` can lift the
 * remainder of the article out of its container.
 *
 * Everything is resolved in one pass, so an unclosed tag costs nothing extra: its entry
 * simply stays on the stack instead of being searched for again.
 */
function findMapElements(html: string): TagSpan[] {
    const elements: TagSpan[] = [];
    const openTagsByName = new Map<string, number[]>();
    const mapStarts = new Set<number>();

    ANY_TAG.lastIndex = 0;
    for (let match = ANY_TAG.exec(html); match; match = ANY_TAG.exec(html)) {
        const name = match[2].toLowerCase();
        const attributes = optionalGroup(match, 3) ?? '';
        const end = match.index + match[0].length;

        if (match[1] === '/') {
            const start = openTagsByName.get(name)?.pop();
            if (start !== undefined && mapStarts.has(start)) {
                elements.push({ start, end });
            }
            continue;
        }

        const isMap = MAP_CLASS.test(attributes);
        // A trailing slash lands in the attribute group, since `/` is not `>`.
        if (attributes.endsWith('/')) {
            if (isMap) {
                elements.push({ start: match.index, end });
            }
            continue;
        }

        if (isMap) {
            mapStarts.add(match.index);
        }
        pushOpenTag(openTagsByName, name, match.index);
    }

    return elements;
}

function pushOpenTag(openTagsByName: Map<string, number[]>, name: string, start: number): void {
    const openTags = openTagsByName.get(name);

    if (openTags) {
        openTags.push(start);
        return;
    }
    openTagsByName.set(name, [start]);
}
