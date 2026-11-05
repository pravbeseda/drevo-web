import { versionUrl } from '../helpers/page-kind';
import { ArticleVersion, NewsTopic, PageKind, toCalendarDateString } from '@drevo-web/shared';

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
    /** Where the editor leaves to on cancel: what was being edited, or where a new page was asked for. */
    readonly exitUrl: string;
    /** The key the draft of this session is stored under. */
    readonly draftKey: string;
    /** The day of a news item being edited, `YYYY-MM-DD`; only a news edit session of a dated item has it. */
    readonly newsDate?: string;
    /** The sections a news item being created picks from; only a news create session has them. */
    readonly newsTopics?: readonly NewsTopic[];
}

export function toEditSession(version: ArticleVersion, kind: PageKind): PageEditSession {
    const url = versionUrl(kind, version.articleId, version.versionId);
    return {
        kind,
        mode: 'edit',
        articleId: version.articleId,
        versionId: version.versionId,
        title: version.title,
        content: version.content,
        exitUrl: url,
        draftKey: `${url}/edit`,
        ...(version.newsDate ? { newsDate: toCalendarDateString(version.newsDate) } : {}),
    };
}
