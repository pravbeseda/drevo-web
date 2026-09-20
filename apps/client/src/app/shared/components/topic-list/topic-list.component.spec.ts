import { TopicListComponent } from './topic-list.component';
import { provideRouter } from '@angular/router';
import { ForumTopicListItem } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

function createItem(overrides: Partial<ForumTopicListItem> = {}): ForumTopicListItem {
    return {
        id: 7,
        title: 'Первая тема',
        author: 'Иванов И.И.',
        createdAt: new Date('2025-03-15T10:00:00Z'),
        repliesCount: 3,
        lastPostId: 21,
        lastPostAt: new Date('2025-03-16T12:30:00Z'),
        pinned: false,
        lastAuthor: 'Петров П.П.',
        article: { id: 15, title: 'Статья' },
        ...overrides,
    };
}

describe('TopicListComponent', () => {
    let spectator: Spectator<TopicListComponent>;

    const createComponent = createComponentFactory({
        component: TopicListComponent,
        providers: [provideRouter([])],
    });

    const render = (items: readonly ForumTopicListItem[]): void => {
        spectator = createComponent({ props: { items } });
    };

    it('renders one row per topic', () => {
        render([createItem(), createItem({ id: 8, title: 'Вторая тема' })]);

        expect(spectator.queryAll('[data-testid="topic-item"]')).toHaveLength(2);
    });

    it('links a topic title to its page', () => {
        render([createItem({ id: 42 })]);

        expect(spectator.query('[data-testid="topic-title"]')?.getAttribute('href')).toBe('/forum/topic/42');
    });

    it('addresses a topic under the current route where the list asks for it', () => {
        spectator = createComponent({ props: { items: [createItem({ id: 42 })], relativeLinks: true } });

        expect(spectator.query('[data-testid="topic-title"]')?.getAttribute('href')).toBe('/topic/42');
    });

    it('shows the author and the replies count', () => {
        render([createItem({ author: 'Петров П.П.', repliesCount: 12 })]);

        expect(spectator.query('[data-testid="topic-author"]')).toHaveText('Петров П.П.');
        expect(spectator.query('[data-testid="topic-replies"]')).toHaveText('12');
    });

    it('names the article the topic discusses and links it', () => {
        render([createItem({ article: { id: 15, title: 'БОГ' } })]);

        const article = spectator.query('[data-testid="topic-article"]');
        expect(article).toHaveText('БОГ');
        expect(article?.getAttribute('href')).toBe('/articles/15');
    });

    it('names no article for a topic attached to none', () => {
        render([createItem({ article: undefined })]);

        expect(spectator.query('[data-testid="topic-article"]')).not.toExist();
    });

    it('names who wrote the last post', () => {
        render([createItem({ lastAuthor: 'Валентин100' })]);

        expect(spectator.query('[data-testid="topic-last-author"]')).toHaveText('Валентин100');
    });

    it('names no last author when the last post resolved to no row', () => {
        render([createItem({ lastAuthor: undefined })]);

        expect(spectator.query('[data-testid="topic-last-author"]')).not.toExist();
    });

    it('links the last post to its place in the topic', () => {
        render([createItem({ id: 42, lastPostId: 21 })]);

        expect(spectator.query('[data-testid="topic-last-post"]')?.getAttribute('href')).toBe('/forum/topic/42/21');
    });

    it('shows the last-post date as plain text when the topic has no last post', () => {
        render([createItem({ lastPostId: undefined })]);

        const lastPost = spectator.query('[data-testid="topic-last-post"]');
        expect(lastPost).toBeTruthy();
        expect(lastPost?.getAttribute('href')).toBeNull();
    });

    it('omits the last post entirely when the topic has no date for it', () => {
        render([createItem({ lastPostId: undefined, lastPostAt: undefined })]);

        expect(spectator.query('[data-testid="topic-last-post"]')).toBeNull();
    });

    it('marks a pinned topic', () => {
        render([createItem({ pinned: true })]);

        expect(spectator.query('[data-testid="topic-pinned"]')).toBeTruthy();
    });

    it('leaves an unpinned topic unmarked', () => {
        render([createItem({ pinned: false })]);

        expect(spectator.query('[data-testid="topic-pinned"]')).toBeNull();
    });

    it('renders nothing for an empty list — the empty state belongs to the page', () => {
        render([]);

        expect(spectator.queryAll('[data-testid="topic-item"]')).toHaveLength(0);
    });
});
