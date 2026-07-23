import { ArticleVersion } from '@drevo-web/shared';

/**
 * What the editor works on — an existing version or a brand-new article.
 * Lets ArticleEditComponent serve both routes without a second copy.
 */
export interface ArticleEditSession {
    readonly mode: 'edit' | 'create';
    readonly articleId: number;
    readonly versionId: number;
    readonly title: string;
    readonly content: string;
}

export function toEditSession(version: ArticleVersion): ArticleEditSession {
    return {
        mode: 'edit',
        articleId: version.articleId,
        versionId: version.versionId,
        title: version.title,
        content: version.content,
    };
}
