import { Observable } from 'rxjs';
import { Article } from '@drevo-web/shared';

export interface ArticleApi {
    getArticle: () => Observable<Article>;
}
