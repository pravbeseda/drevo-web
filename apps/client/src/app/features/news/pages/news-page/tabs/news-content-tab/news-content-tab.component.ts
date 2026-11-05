import { PageSidebarActionsComponent } from '../../../../../../shared/components/page-sidebar-actions/page-sidebar-actions.component';
import { WikiContentComponent } from '../../../../../../shared/components/wiki-content/wiki-content.component';
import { versionUrl } from '../../../../../../shared/helpers/page-kind';
import { NewsPageService } from '../../../../services/news-page.service';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModerationResult, formatCalendarDate } from '@drevo-web/shared';

/** The news item itself: the day it is about, its sections and its text. */
@Component({
    selector: 'app-news-content-tab',
    imports: [PageSidebarActionsComponent, RouterLink, WikiContentComponent],
    templateUrl: './news-content-tab.component.html',
    styleUrl: './news-content-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsContentTabComponent {
    private readonly pageService = inject(NewsPageService);

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

    onModerated(result: ModerationResult): void {
        this.pageService.updateApproval(result.approved, result.comment);
    }
}
