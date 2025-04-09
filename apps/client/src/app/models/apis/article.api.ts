import { Observable } from 'rxjs';
import { Article } from '@drevo-web/shared';

export interface ArticleApi {
    getVersion: (id: number) => Observable<Article>;
}
