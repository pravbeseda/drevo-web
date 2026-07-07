/**
 * Rewrites fragment-only links (`href="#fn5"`) to absolute same-page links
 * (`href="/articles/123#fn5"`).
 *
 * Reason: the app uses `<base href="/">`, so browsers resolve a fragment-only
 * href against the base URL — `#fn5` becomes `origin/#fn5`, losing the current
 * page path. That breaks "open in new tab", middle-click and the hover preview.
 * Prepending the current path keeps the anchor on the current page.
 *
 * `basePath` must be the current path + query (no hash), e.g. `location.pathname
 * + location.search`, so its encoding matches what the browser reports. An empty
 * `basePath` (e.g. SSR) leaves the content untouched.
 */
export function resolveFragmentLinks(html: string, basePath: string): string {
    if (!basePath) {
        return html;
    }

    return html.replace(
        /(\shref=)(["'])#([^"']+)\2/gi,
        (_match, prefix, quote, anchorId) => `${prefix}${quote}${basePath}#${anchorId}${quote}`,
    );
}
