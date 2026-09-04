import { parsePositiveIntParam, readRouteParam } from '../../shared/helpers/route-params';
import { ActivatedRouteSnapshot } from '@angular/router';

export interface ForumSectionParams {
    readonly part: string | undefined;
    readonly partId: number | undefined;
}

/**
 * The section an address names, or `undefined` when it names one the readers
 * refuse. Both the resolver and the page that pages through the section read
 * it here: a matrix param or a malformed id must widen the request to every
 * section in neither of them, and that is one decision, not two.
 *
 * Whether the address names a param is asked of `paramMap` directly — a param
 * `readRouteParam` rejects is still one the address asked for.
 */
export function readForumSectionParams(route: ActivatedRouteSnapshot): ForumSectionParams | undefined {
    const namesPart = route.paramMap.has('part');
    const namesPartId = route.paramMap.has('partId');
    const part = namesPart ? readRouteParam(route, 'part') : undefined;
    const partId = namesPartId ? parsePositiveIntParam(readRouteParam(route, 'partId')) : undefined;

    if ((namesPart && part === undefined) || (namesPartId && partId === undefined)) {
        return undefined;
    }

    return { part, partId };
}

/** An address naming a message the readers refuse — no anchor, and no topic either. */
export const INVALID_ANCHOR = 'invalid-anchor';

/**
 * The message an address anchors on: its id, `undefined` when the address
 * names none, and `INVALID_ANCHOR` when it names one that is not an id.
 */
export function readForumAnchor(route: ActivatedRouteSnapshot): number | undefined | typeof INVALID_ANCHOR {
    if (!route.paramMap.has('messageId')) {
        return undefined;
    }

    return parsePositiveIntParam(readRouteParam(route, 'messageId')) ?? INVALID_ANCHOR;
}
