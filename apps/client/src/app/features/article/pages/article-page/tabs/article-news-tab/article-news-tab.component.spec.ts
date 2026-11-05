import { ArticleNewsTabComponent } from './article-news-tab.component';
import { ArticlePageService } from '../../../../services/article-page.service';
import { AuthService } from '../../../../../../services/auth/auth.service';
import { NewsService } from '../../../../../../services/news/news.service';
import { SidebarActionComponent } from '../../../../../../shared/components/sidebar-action/sidebar-action.component';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NewsListItem, NewsListPage, User } from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { VirtualScrollerComponent } from '@drevo-web/ui/virtual-scroller';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';

function item(id: number, newsDate?: Date): NewsListItem {
    return { id, title: `Новость ${id}`, newsDate };
}

function page(items: readonly NewsListItem[], total = items.length): NewsListPage {
    return { items, total };
}

describe('ArticleNewsTabComponent', () => {
    let spectator: Spectator<ArticleNewsTabComponent>;
    let newsService: { getArticleNews: jest.Mock };
    const articleId = signal<number | undefined>(42);
    const user = new BehaviorSubject<User | undefined>(undefined);

    const createComponent = createComponentFactory({
        component: ArticleNewsTabComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            { provide: ArticlePageService, useValue: { articleId } },
            { provide: AuthService, useFactory: () => ({ user$: user.asObservable() }) },
        ],
        detectChanges: false,
    });

    const render = (): void => {
        spectator = createComponent({ providers: [{ provide: NewsService, useValue: newsService }] });
        spectator.detectChanges();
    };

    const addAction = (): SidebarActionComponent | undefined =>
        spectator.queryAll(SidebarActionComponent).find(action => action.label() === 'Добавить новость');

    beforeEach(() => {
        articleId.set(42);
        user.next(createMockUser({ permissions: { canEdit: true } }));
        newsService = { getArticleNews: jest.fn().mockReturnValue(of(page([item(1, new Date(2026, 10, 4))]))) };
    });

    it("opens on the first page of the article's news", () => {
        render();

        expect(newsService.getArticleNews).toHaveBeenCalledWith(42, 1);
    });

    it('names the day of each news item and leaves an undated one without', () => {
        newsService.getArticleNews.mockReturnValue(of(page([item(1, new Date(2026, 10, 4)), item(2)])));
        render();

        expect(spectator.component.rows().map(row => [row.id, row.title, row.day])).toEqual([
            [1, 'Новость 1', '4 ноября 2026'],
            [2, 'Новость 2', undefined],
        ]);
    });

    it('hands the rows to the scroller, sized for the news still to load', () => {
        newsService.getArticleNews.mockReturnValue(of(page([item(1)], 30)));
        render();

        const scroller = spectator.query(VirtualScrollerComponent);
        expect(scroller?.items()).toEqual(spectator.component.rows());
        expect(scroller?.totalItems()).toBe(30);
    });

    it('appends the next page as the reader scrolls', () => {
        newsService.getArticleNews.mockReturnValueOnce(of(page([item(1)], 2)));
        render();
        newsService.getArticleNews.mockReturnValueOnce(of(page([item(2)], 2)));

        spectator.component.onLoadMore();

        expect(newsService.getArticleNews).toHaveBeenLastCalledWith(42, 2);
        expect(spectator.component.rows().map(row => row.id)).toEqual([1, 2]);
    });

    it('asks for no page past the last one', () => {
        render();

        spectator.component.onLoadMore();

        expect(newsService.getArticleNews).toHaveBeenCalledTimes(1);
    });

    it('asks for one page at a time', () => {
        newsService.getArticleNews.mockReturnValueOnce(of(page([item(1)], 3)));
        render();
        newsService.getArticleNews.mockReturnValue(NEVER);

        spectator.component.onLoadMore();
        spectator.component.onLoadMore();

        expect(newsService.getArticleNews).toHaveBeenCalledTimes(2);
    });

    it('starts over when the page moves to another article', () => {
        render();
        newsService.getArticleNews.mockReturnValue(of(page([item(7)])));

        articleId.set(43);
        spectator.detectChanges();

        expect(newsService.getArticleNews).toHaveBeenLastCalledWith(43, 1);
        expect(spectator.component.rows().map(row => row.id)).toEqual([7]);
    });

    it('says so when the article has no news', () => {
        newsService.getArticleNews.mockReturnValue(of(page([])));
        render();

        expect(spectator.query('[data-testid="article-news-empty"]')?.textContent).toContain(
            'Новостей, относящихся к этой статье, не найдено.',
        );
    });

    it('says so when the news fail to load', () => {
        newsService.getArticleNews.mockReturnValue(throwError(() => new Error('down')));
        render();

        expect(spectator.query('[data-testid="article-news-error"]')).toBeTruthy();
    });

    describe('adding a news item', () => {
        it("is offered to a reader who may edit, opening the editor under the article's tab", () => {
            render();

            expect(addAction()?.link()).toBe('/articles/42/news/new');
        });

        it('is not offered to a reader who may not edit', () => {
            user.next(createMockUser({ permissions: { canEdit: false } }));
            render();

            expect(addAction()).toBeUndefined();
        });
    });
});
