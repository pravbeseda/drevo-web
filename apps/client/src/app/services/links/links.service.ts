import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IframeService } from '../iframe/iframe.service';

@Injectable()
export class LinksService {
    constructor(private readonly iframeService: IframeService) {}

    getLinkStatuses(links: string[]): Observable<Record<string, boolean>> {
        this.iframeService.sendMessage({ action: 'updateLinks', links });
        return this.iframeService.linksState$;
    }
}
