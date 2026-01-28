import { Article } from '@drevo-web/shared';
import { Observable } from 'rxjs';

export interface ArticleApi {
    getArticle: () => Observable<Article>;
}
