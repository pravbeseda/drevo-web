import { ActivatedRouteSnapshot, UrlSegment, convertToParamMap } from '@angular/router';

/**
 * A route snapshot in the shape `readRouteParam` reads: the params the router
 * answers with, and the matched path they came from. A path with no matrix
 * params is the default, so only the cases about them spell their segments out.
 * The query carries no positional params, so it defaults to empty as well.
 */
export function createRouteSnapshot(
    params: Record<string, string>,
    segments: UrlSegment[] = Object.values(params).map(value => new UrlSegment(value, {})),
    queryParams: Record<string, string> = {},
): ActivatedRouteSnapshot {
    return {
        paramMap: convertToParamMap(params),
        queryParamMap: convertToParamMap(queryParams),
        pathFromRoot: [{ url: segments } as ActivatedRouteSnapshot],
    } as ActivatedRouteSnapshot;
}
