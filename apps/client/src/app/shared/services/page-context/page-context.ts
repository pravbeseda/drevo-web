import { Signal } from '@angular/core';
import { ApprovalStatus, ArticleVersion, PageKind } from '@drevo-web/shared';

/**
 * The wiki page a page shell holds — an article or a news item — for the tabs
 * both kinds share. The shell's route provides it as its own page service:
 * `{ provide: PageContext, useExisting: ArticlePageService }`.
 *
 * Route-scoped, so a modal must not read it: a dialog's injector does not see
 * the route's providers. Hand a modal what it needs through its data instead.
 */
export abstract class PageContext {
    abstract readonly kind: PageKind;
    /** The page's current version; absent while there is none (missing page, load error). */
    abstract readonly article: Signal<ArticleVersion | undefined>;
    abstract readonly articleId: Signal<number | undefined>;
    abstract readonly title: Signal<string | undefined>;

    /** Reflects a moderation decision on the current version. */
    abstract updateApproval(approved: ApprovalStatus, comment: string): void;
}
