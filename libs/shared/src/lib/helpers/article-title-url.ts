/**
 * Article title <-> `/articles/find/:title` route segment.
 *
 * The segment carries the title verbatim: the backend emits
 * `/articles/find/<rawurlencode(title)>` (space -> %20, '+' -> %2B), and the
 * Angular router percent-encodes/decodes the segment losslessly on its own. So
 * these helpers must NOT transform the title — a space<->'+' mapping would be
 * lossy for titles containing a literal '+' (e.g. the death marker in
 * "… (+ 1919)"): the router cannot tell an encoded space from a literal plus,
 * and the title would come back corrupted.
 *
 * The pair is kept as a named seam marking the single place where title <->
 * route-segment translation lives, should a non-identity transform ever be
 * needed again.
 */
export function encodeArticleTitle(title: string): string {
    return title;
}

export function decodeArticleTitle(param: string): string {
    return param;
}
