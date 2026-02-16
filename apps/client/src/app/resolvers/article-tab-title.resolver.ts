import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ArticleVersion } from '@drevo-web/shared';

/**
 * Factory for creating tab title resolvers.
 * Reads article data from parent route's resolved data to build a composite title.
 * Parent resolvers are guaranteed to complete before child resolvers run.
 */
export function createArticleTabTitleResolver(tabName: string): ResolveFn<string> {
    return (route: ActivatedRouteSnapshot) => {
        const article = route.parent?.data['article'] as ArticleVersion | undefined;
        return article ? `${tabName}: ${article.title}` : tabName;
    };
}
