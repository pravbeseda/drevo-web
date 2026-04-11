import { LinksApiService } from './links-api.service';
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Backend limit per request (WikiLinksApiController::MAX_LINKS)
export const MAX_LINKS = 500;

@Injectable()
export class LinksService {
    private readonly linksApiService = inject(LinksApiService);

    getLinkStatuses(links: string[]): Observable<Record<string, boolean>> {
        if (links.length === 0) {
            return of({});
        }

        const chunks = Array.from({ length: Math.ceil(links.length / MAX_LINKS) }, (_, i) =>
            links.slice(i * MAX_LINKS, (i + 1) * MAX_LINKS),
        );

        return forkJoin(chunks.map(chunk => this.linksApiService.checkLinks(chunk))).pipe(
            map(results => Object.assign({}, ...results)),
        );
    }
}
