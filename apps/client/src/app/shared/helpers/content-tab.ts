import { Router, UrlSegmentGroup } from '@angular/router';

/** The path the primary outlet shows for `url`, without the leading slash; absent at the root. */
export function primaryPath(router: Router, url: string): string | undefined {
    // `children` is typed as if every outlet were present; only `primary` is guaranteed
    // to exist while an outlet is actually activated.
    const children: Record<string, UrlSegmentGroup | undefined> = router.parseUrl(url).root.children;
    return children['primary']?.segments.map(segment => segment.path).join('/');
}

/** Whether `path` shows the page's own content — the page or one of its versions — rather than another tab. */
export function isPageContentPath(path: string, basePath: string): boolean {
    const base = basePath.slice(1);
    return path === base || path.startsWith(`${base}/version/`);
}
