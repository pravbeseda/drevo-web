import { Injectable } from '@angular/core';
import { ArticleApi } from '../../models/apis/article.api';
import { Observable, of } from 'rxjs';
import { article1 } from '../../mocks/articles';
import { Article } from '@drevo-web/shared';

@Injectable()
export class ArticleService implements ArticleApi {
    getVersion(id: number): Observable<Article> {
        const article: Article = {
            articleId: 1,
            versionId: 1,
            title: 'Article 1',
            content: article1,
        };
        return of(article);
    }
}
