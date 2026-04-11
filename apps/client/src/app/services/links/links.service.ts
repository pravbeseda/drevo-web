import { LinksApiService } from './links-api.service';
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

const MAX_LINKS = 500;

@Injectable()
export class LinksService {
    private readonly linksApiService = inject(LinksApiService);

    getLinkStatuses(links: string[]): Observable<Record<string, boolean>> {
        if (links.length === 0) {
            return of({});
        }

        const chunks: string[][] = [];
        for (let i = 0; i < links.length; i += MAX_LINKS) {
            chunks.push(links.slice(i, i + MAX_LINKS));
        }

        if (chunks.length === 1) {
            return this.linksApiService.checkLinks(chunks[0]);
        }

        return forkJoin(chunks.map(chunk => this.linksApiService.checkLinks(chunk))).pipe(
            map(results => Object.assign({}, ...results))
        );
    }
}
