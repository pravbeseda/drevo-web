import { ArticleVersion, NewsTopic, PageKind } from '@drevo-web/shared';

/**
 * What the editor works on — an existing version of an article or a news
 * item, or a brand-new page. Lets PageEditComponent serve every edit route
 * without a second copy.
 */
export interface PageEditSession {
    readonly kind: PageKind;
    readonly mode: 'edit' | 'create';
    readonly articleId: number;
    readonly versionId: number;
    readonly title: string;
    readonly content: string;
    /** The sections a news item being created picks from; only a news create session has them. */
    readonly newsTopics?: readonly NewsTopic[];
}

export function toEditSession(version: ArticleVersion, kind: PageKind): PageEditSession {
    return {
        kind,
        mode: 'edit',
        articleId: version.articleId,
        versionId: version.versionId,
        title: version.title,
        content: version.content,
    };
}
