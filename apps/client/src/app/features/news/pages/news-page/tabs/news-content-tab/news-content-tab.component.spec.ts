import { PageSidebarActionsComponent } from '../../../../../../shared/components/page-sidebar-actions/page-sidebar-actions.component';
import { NewsContentTabComponent } from './news-content-tab.component';
import { createMockArticle } from '../../../../../../shared/testing/article-testing.helper';
import { NewsPageService } from '../../../../services/news-page.service';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ApprovalStatus, ArticleVersion, NewsTopic } from '@drevo-web/shared';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

describe('NewsContentTabComponent', () => {
    let spectator: Spectator<NewsContentTabComponent>;
    let news: ReturnType<typeof signal<ArticleVersion | undefined>>;
    let sections: ReturnType<typeof signal<readonly NewsTopic[]>>;
    const updateApproval = jest.fn();

    const createComponent = createComponentFactory({
        component: NewsContentTabComponent,
        providers: [provideRouter([]), mockLoggerProvider()],
        detectChanges: false,
    });

    beforeEach(() => {
        news = signal<ArticleVersion | undefined>(
            createMockArticle({
                articleId: 7,
                versionId: 70,
                content: '<p>Текст новости</p>',
                newsDate: new Date(2026, 10, 4),
            }),
        );
        sections = signal<readonly NewsTopic[]>([
            { id: 3, title: 'Церковь' },
            { id: 5, title: 'Общество' },
        ]);
        spectator = createComponent({
            providers: [{ provide: NewsPageService, useValue: { article: news, sections, updateApproval } }],
        });
    });

    it('shows the text of the news item', () => {
        spectator.detectChanges();

        expect(spectator.query('[data-testid="news-content"]')?.textContent).toContain('Текст новости');
    });

    it('shows the day the news item is about', () => {
        spectator.detectChanges();

        expect(spectator.query('[data-testid="news-date"]')?.textContent?.trim()).toBe('4 ноября 2026');
    });

    it('leaves the date out when the news item has none', () => {
        news.update(current => (current ? { ...current, newsDate: undefined } : current));
        spectator.detectChanges();

        expect(spectator.query('[data-testid="news-date"]')).toBeNull();
    });

    it('links each section of the news item to its feed', () => {
        spectator.detectChanges();

        const links = spectator.queryAll<HTMLAnchorElement>('[data-testid="news-section"]');
        expect(links.map(link => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
            ['Церковь', '/news?topic=3'],
            ['Общество', '/news?topic=5'],
        ]);
    });

    it('offers editing and moderating the current version as a news item', () => {
        spectator.detectChanges();

        const actions = spectator.query(PageSidebarActionsComponent);
        expect(actions?.kind()).toBe('news');
        expect(actions?.editUrl()).toBe('/news/7/version/70/edit');
    });

    it('reflects a moderation decision on the news item', () => {
        spectator.detectChanges();

        spectator.query(PageSidebarActionsComponent)?.moderated.emit({
            versionId: 70,
            articleId: 7,
            approved: ApprovalStatus.Approved,
            comment: 'Хорошо',
        });

        expect(updateApproval).toHaveBeenCalledWith(ApprovalStatus.Approved, 'Хорошо');
    });
});
