import { ActivatedRouteSnapshot, UrlSegment, convertToParamMap } from '@angular/router';

/**
 * A route snapshot in the shape `readRouteParam` reads: the params the router
 * answers with, and the matched path they came from. A path with no matrix
 * params is the default, so only the cases about them spell their segments out.
 */
export function createRouteSnapshot(
    params: Record<string, string>,
    segments: UrlSegment[] = Object.values(params).map(value => new UrlSegment(value, {})),
): ActivatedRouteSnapshot {
    return {
        paramMap: convertToParamMap(params),
        pathFromRoot: [{ url: segments } as ActivatedRouteSnapshot],
    } as ActivatedRouteSnapshot;
}
