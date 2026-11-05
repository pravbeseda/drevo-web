import { AuthService } from '../../../../../../services/auth/auth.service';
import { PageSidebarActionsComponent } from '../../../../../../shared/components/page-sidebar-actions/page-sidebar-actions.component';
import { SidebarActionComponent } from '../../../../../../shared/components/sidebar-action/sidebar-action.component';
import { WikiContentComponent } from '../../../../../../shared/components/wiki-content/wiki-content.component';
import { versionUrl } from '../../../../../../shared/helpers/page-kind';
import { NewsMetaDialogData } from '../../../../components/news-meta-dialog/news-meta-dialog.component';
import { NewsPageService } from '../../../../services/news-page.service';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ModerationResult, NewsMeta, formatCalendarDate, toCalendarDateString } from '@drevo-web/shared';
import { ModalService } from '@drevo-web/ui/modal';

/** The news item itself: the day it is about, its sections and its text. */
@Component({
    selector: 'app-news-content-tab',
    imports: [PageSidebarActionsComponent, SidebarActionComponent, WikiContentComponent],
    templateUrl: './news-content-tab.component.html',
    styleUrl: './news-content-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsContentTabComponent {
    private readonly pageService = inject(NewsPageService);
    private readonly modalService = inject(ModalService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly user = toSignal(inject(AuthService).user$);

    readonly canEditMeta = computed(() => this.user()?.permissions.canModerate ?? false);

    readonly news = this.pageService.article;
    readonly sections = this.pageService.sections;
    readonly editUrl = computed(() => {
        const news = this.news();
        return news ? `${versionUrl('news', news.articleId, news.versionId)}/edit` : undefined;
    });
    readonly date = computed(() => {
        const newsDate = this.news()?.newsDate;
        return newsDate ? formatCalendarDate(newsDate) : undefined;
    });

    openMeta(): void {
        const news = this.news();
        if (!news) return;
        const data: NewsMetaDialogData = {
            newsId: news.articleId,
            fields: {
                title: news.title,
                newsDate: news.newsDate ? toCalendarDateString(news.newsDate) : '',
                topic: news.topics[0],
            },
            rank: news.rank ?? 0,
            topics: this.pageService.topics(),
        };
        this.modalService
            .open<NewsMetaDialogData, NewsMeta>(
                () =>
                    import('../../../../components/news-meta-dialog/news-meta-dialog.component').then(
                        m => m.NewsMetaDialogComponent,
                    ),
                { data },
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(meta => {
                if (meta) this.pageService.applyMeta(meta);
            });
    }

    onModerated(result: ModerationResult): void {
        this.pageService.updateApproval(result.approved, result.comment);
    }
}
