/**
 * Article title <-> `/articles/find/:title` route segment.
 *
 * Only spaces are translated to `+` and back — no percent-encoding. The encoded
 * value goes into `routerLink`/`TabGroupItem.route`, and Angular percent-encodes
 * the segment itself when serialising the URL; pre-encoding here would double
 * it (`%D0` -> `%25D0`). Legacy Yii renders such hrefs via `urlencode`, which is
 * why the separator is `+` rather than `%20`.
 */
export function encodeArticleTitle(title: string): string {
    return title.replace(/ /g, '+');
}

export function decodeArticleTitle(param: string): string {
    return param.replace(/\+/g, ' ');
}
