import { Injectable } from '@angular/core';
import { ArticleApi } from '../../models/apis/article.api';
import { Observable } from 'rxjs';
import { Article } from '@drevo-web/shared';
import { IframeService } from '../iframe/iframe.service';

@Injectable()
export class ArticleService implements ArticleApi {
    constructor(private readonly iframeService: IframeService) {}

    getVersion(id: number): Observable<Article> {
        return this.iframeService.article$;
    }
}
