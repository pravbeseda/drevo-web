interface PathLocation {
    readonly pathname: string;
}

/**
 * Returns the target id of a same-page anchor, or `undefined` when the link
 * points elsewhere. Accepts both bare fragments (`#fn5`) and fragments made
 * absolute to the current page (`/articles/1#fn5`, produced by
 * `resolveFragmentLinks`). Matching is by path only — a link whose path differs
 * from `location` is treated as cross-page navigation, not an in-page anchor.
 */
export function inPageAnchorId(href: string, location: PathLocation | undefined): string | undefined {
    if (href.startsWith('#')) {
        return href.length > 1 ? href.substring(1) : undefined;
    }

    if (!location) {
        return undefined;
    }

    const prefix = `${location.pathname}#`;
    return href.startsWith(prefix) && href.length > prefix.length ? href.substring(prefix.length) : undefined;
}
