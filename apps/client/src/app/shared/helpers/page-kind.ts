import { PageKind } from '@drevo-web/shared';

export function pageUrl(kind: PageKind, pageId: number): string {
    return `/${kind}/${pageId}`;
}

export function versionUrl(kind: PageKind, pageId: number, versionId: number): string {
    return `${pageUrl(kind, pageId)}/version/${versionId}`;
}

/** The diff of `versionId` against the version before it, or against `otherVersionId`. */
export function diffUrl(kind: PageKind, versionId: number, otherVersionId?: number): string {
    const base = `/history/${kind}/diff/${versionId}`;
    return otherVersionId === undefined ? base : `${base}/${otherVersionId}`;
}
