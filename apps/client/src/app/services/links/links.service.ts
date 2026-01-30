import { LinksApiService } from './links-api.service';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable()
export class LinksService {
    private readonly linksApiService = inject(LinksApiService);

    getLinkStatuses(links: string[]): Observable<Record<string, boolean>> {
        if (links.length === 0) {
            return of({});
        }

        return this.linksApiService.checkLinks(links);
    }
}
