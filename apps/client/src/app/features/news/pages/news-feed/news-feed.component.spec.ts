import { NewsFeedComponent } from './news-feed.component';
import { NewsService } from '../../../../services/news/news.service';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NewsFeedItem, NewsFeedResponse } from '@drevo-web/shared';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { VirtualScrollerComponent } from '@drevo-web/ui/virtual-scroller';
import { NEVER, of, throwError } from 'rxjs';

function item(id: number, newsDate: Date | undefined, topics: readonly number[] = [3]): NewsFeedItem {
    return { id, title: `Новость ${id}`, newsDate, topics };
}

function page(items: readonly NewsFeedItem[], total = items.length, pageNumber = 1): NewsFeedResponse {
    return { items, total, page: pageNumber, totalPages: Math.ceil(total / 25) };
}

describe('NewsFeedComponent', () => {
    let spectator: Spectator<NewsFeedComponent>;
    let newsService: { getFeed: jest.Mock };

    const topics = [
        { id: 3, title: 'Церковь' },
        { id: 5, title: 'Общество' },
    ];

    const createComponent = createComponentFactory({
        component: NewsFeedComponent,
        providers: [provideRouter([]), mockLoggerProvider()],
        detectChanges: false,
    });

    const newsRows = () => spectator.component.displayItems().flatMap(entry => (entry.type === 'news' ? [entry] : []));

    const render = (topic?: string): void => {
        spectator = createComponent({
            props: { topic },
            providers: [
                { provide: NewsService, useValue: newsService },
                { provide: ActivatedRoute, useValue: { data: of({ topics }) } },
            ],
        });
        spectator.detectChanges();
    };

    beforeEach(() => {
        newsService = { getFeed: jest.fn().mockReturnValue(of(page([item(1, new Date(2026, 10, 4))]))) };
    });

    it('opens on the first page of every section', () => {
        render();

        expect(newsService.getFeed).toHaveBeenCalledWith({ topic: undefined, page: 1 });
    });

    it('narrows the feed to the section the address names', () => {
        render('5');

        expect(newsService.getFeed).toHaveBeenCalledWith({ topic: 5, page: 1 });
        expect(spectator.component.currentTopic()).toBe(5);
    });

    it('reads a malformed section as every section', () => {
        render('5abc');

        expect(newsService.getFeed).toHaveBeenCalledWith({ topic: undefined, page: 1 });
    });

    it('groups the news under the days they are about, the undated ones last', () => {
        newsService.getFeed.mockReturnValue(
            of(
                page([
                    item(1, new Date(2025, 0, 15)),
                    item(2, new Date(2025, 0, 15)),
                    item(3, new Date(2025, 0, 14)),
                    item(4, undefined),
                ]),
            ),
        );
        render();

        expect(
            spectator.component.displayItems().map(entry => (entry.type === 'header' ? entry.label : entry.data.id)),
        ).toEqual(['15 января 2025 г.', 1, 2, '14 января 2025 г.', 3, 'Без даты', 4]);
    });

    it('hands the rows to the scroller', () => {
        render();

        expect(spectator.query(VirtualScrollerComponent)?.items()).toEqual(spectator.component.displayItems());
    });

    it('names the sections of a news item while every section is shown', () => {
        newsService.getFeed.mockReturnValue(of(page([item(1, undefined, [5, 3, 9])])));
        render();

        expect(newsRows().map(row => row.sections)).toEqual(['Общество, Церковь']);
    });

    it('does not repeat the section the feed is narrowed to', () => {
        render('3');

        expect(newsRows().map(row => row.sections)).toEqual(['']);
    });

    it('appends the next page as the reader scrolls', () => {
        newsService.getFeed.mockReturnValueOnce(of(page([item(1, undefined)], 2)));
        render();
        newsService.getFeed.mockReturnValueOnce(of(page([item(2, undefined)], 2, 2)));

        spectator.component.onLoadMore();

        expect(newsService.getFeed).toHaveBeenLastCalledWith({ topic: undefined, page: 2 });
        expect(spectator.component.displayItems().filter(entry => entry.type === 'news')).toHaveLength(2);
    });

    it('asks for no page past the last one', () => {
        render();

        spectator.component.onLoadMore();

        expect(newsService.getFeed).toHaveBeenCalledTimes(1);
    });

    it('asks for one page at a time', () => {
        newsService.getFeed.mockReturnValueOnce(of(page([item(1, undefined)], 3)));
        render();
        newsService.getFeed.mockReturnValue(NEVER);

        spectator.component.onLoadMore();
        spectator.component.onLoadMore();

        expect(newsService.getFeed).toHaveBeenCalledTimes(2);
    });

    it('starts over when the reader picks another section', () => {
        newsService.getFeed.mockReturnValueOnce(of(page([item(1, undefined)], 2)));
        render();

        spectator.setInput('topic', '5');

        expect(newsService.getFeed).toHaveBeenLastCalledWith({ topic: 5, page: 1 });
    });

    it('says so when there is no news', () => {
        newsService.getFeed.mockReturnValue(of(page([])));
        render();

        expect(spectator.query('[data-testid="news-feed-empty"]')).toBeTruthy();
    });

    it('says so when the feed fails to load', () => {
        newsService.getFeed.mockReturnValue(throwError(() => new Error('down')));
        render();

        expect(spectator.query('[data-testid="news-feed-error"]')).toBeTruthy();
    });

    it('offers the section filter', () => {
        render('5');

        expect(spectator.query('app-news-topic-filter')).toBeTruthy();
    });
});
