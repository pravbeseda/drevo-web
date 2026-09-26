import { MessageCardComponent } from './message-card.component';
import { provideRouter } from '@angular/router';
import { ForumMessage } from '@drevo-web/shared';
import { avatarNameColor } from '@drevo-web/ui';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

function createMessage(overrides: Partial<ForumMessage> = {}): ForumMessage {
    return {
        id: 7,
        parentId: undefined,
        author: { name: 'Иванов И.И.', login: 'ivanov' },
        createdAt: new Date('2025-03-15T10:00:00Z'),
        html: '<p>Текст сообщения</p>',
        ...overrides,
    };
}

describe('MessageCardComponent', () => {
    let spectator: Spectator<MessageCardComponent>;

    const createComponent = createComponentFactory({
        component: MessageCardComponent,
        providers: [provideRouter([])],
    });

    const render = (message: ForumMessage, topicId = 42, anchored = false): void => {
        spectator = createComponent({ props: { message, topicPath: ['forum', 'topic', String(topicId)], anchored } });
    };

    it('names the card after the message it shows', () => {
        render(createMessage({ id: 123 }));

        expect(spectator.element.getAttribute('data-testid')).toBe('message-123');
    });

    it('shows the author as plain text, since the app has no user page yet', () => {
        render(createMessage({ author: { name: 'Петров П.П.', login: 'petrov' } }));

        const author = spectator.query('[data-testid="message-author"]');
        expect(author).toHaveText('Петров П.П.');
        expect(author?.tagName).not.toBe('A');
    });

    it('shows the time the message was posted', () => {
        const createdAt = new Date(2025, 2, 15, 9, 5);
        render(createMessage({ createdAt }));

        expect(spectator.query('[data-testid="message-date"]')).toHaveExactTrimmedText('09:05');
    });

    it('omits the date when the message carries none', () => {
        render(createMessage({ createdAt: undefined }));

        expect(spectator.query('[data-testid="message-date"]')).toBeNull();
    });

    it('links a reply to the message it answers', () => {
        render(createMessage({ id: 7, parentId: 3 }), 42);

        expect(spectator.query('[data-testid="message-reply-to"]')?.getAttribute('href')).toBe('/forum/topic/42/3');
    });

    it('quotes the author and the text of the answered message when it is loaded', () => {
        const parent = createMessage({
            id: 3,
            author: { name: 'Андрей Петров', login: 'andrey' },
            html: '<p>Есть и <a href="#">другая</a> датировка.</p><p>Упомянуть обе?</p>',
        });
        spectator = createComponent({
            props: { message: createMessage({ id: 7, parentId: 3 }), topicPath: ['forum', 'topic', '42'], parent },
        });

        expect(spectator.query('[data-testid="message-quote-author"]')).toHaveExactTrimmedText('Андрей Петров');
        expect(spectator.query('[data-testid="message-quote-text"]')).toHaveExactTrimmedText(
            'Есть и другая датировка. Упомянуть обе?',
        );
    });

    it('draws the quote in the tone of the answered author', () => {
        const parent = createMessage({ id: 3, author: { name: 'Андрей Петров', login: 'andrey' } });
        spectator = createComponent({
            props: { message: createMessage({ id: 7, parentId: 3 }), topicPath: ['forum', 'topic', '42'], parent },
        });

        expect(spectator.query<HTMLElement>('[data-testid="message-reply-to"]')?.style.color).toBe(
            avatarNameColor('Андрей Петров'),
        );
    });

    it('falls back to a plain reply label when the answered message is on a page not loaded yet', () => {
        render(createMessage({ id: 7, parentId: 3 }), 42);

        expect(spectator.query('[data-testid="message-reply-to"]')).toHaveExactTrimmedText('в ответ на сообщение');
        expect(spectator.query('[data-testid="message-quote-author"]')).toBeNull();
    });

    it('addresses the answered message under the topic wherever the topic is mounted', () => {
        spectator = createComponent({
            props: {
                message: createMessage({ id: 7, parentId: 3 }),
                topicPath: ['articles', '15', 'forum', 'topic', '42'],
            },
        });

        expect(spectator.query('[data-testid="message-reply-to"]')?.getAttribute('href')).toBe(
            '/articles/15/forum/topic/42/3',
        );
    });

    it('offers no reply link on a root message', () => {
        render(createMessage({ parentId: undefined }));

        expect(spectator.query('[data-testid="message-reply-to"]')).toBeNull();
    });

    it('renders the body through the wiki renderer', () => {
        render(createMessage({ html: '<p>Текст сообщения</p>' }));

        expect(spectator.query('app-wiki-content')).toBeTruthy();
    });

    it('highlights the card the address anchors on', () => {
        render(createMessage(), 42, true);

        expect(spectator.element).toHaveClass('message-card--anchored');
    });

    it('leaves every other card unhighlighted', () => {
        render(createMessage(), 42, false);

        expect(spectator.element).not.toHaveClass('message-card--anchored');
    });

    it('colours the author in the tone of their avatar', () => {
        render(createMessage({ author: { name: 'Петров П.П.', login: 'petrov' } }));

        expect(spectator.query<HTMLElement>('[data-testid="message-author"]')?.style.color).toBe(
            avatarNameColor('Петров П.П.'),
        );
    });

    describe('within a series of one author', () => {
        const renderInSeries = (props: { seriesStart?: boolean; seriesEnd?: boolean; own?: boolean }): void => {
            spectator = createComponent({
                props: { message: createMessage(), topicPath: ['forum', 'topic', '42'], ...props },
            });
        };

        it('names the author on the first message only', () => {
            renderInSeries({ seriesStart: false });

            expect(spectator.query('[data-testid="message-author"]')).toBeNull();
        });

        it('shows the avatar beside the last message only', () => {
            renderInSeries({ seriesEnd: true });
            expect(spectator.query('[data-testid="message-avatar"]')).toBeTruthy();

            renderInSeries({ seriesEnd: false });
            expect(spectator.query('[data-testid="message-avatar"]')).toBeNull();
        });

        it('draws the bubble tail on the last message only', () => {
            renderInSeries({ seriesEnd: true });
            expect(spectator.element).toHaveClass('message-card--series-end');

            renderInSeries({ seriesEnd: false });
            expect(spectator.element).not.toHaveClass('message-card--series-end');
        });
    });

    describe('a message of the reader', () => {
        beforeEach(() => {
            spectator = createComponent({
                props: { message: createMessage(), topicPath: ['forum', 'topic', '42'], own: true },
            });
        });

        it('is set apart as their own', () => {
            expect(spectator.element).toHaveClass('message-card--own');
        });

        it('carries neither the name nor the avatar', () => {
            expect(spectator.query('[data-testid="message-author"]')).toBeNull();
            expect(spectator.query('[data-testid="message-avatar"]')).toBeNull();
        });
    });

    it('leaves a message of someone else unmarked', () => {
        render(createMessage());

        expect(spectator.element).not.toHaveClass('message-card--own');
    });
});
