import { MessageCardComponent } from './message-card.component';
import { provideRouter } from '@angular/router';
import { ForumMessage } from '@drevo-web/shared';
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
        spectator = createComponent({ props: { message, topicId, anchored } });
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

    it('shows the date the message was posted', () => {
        render(createMessage());

        expect(spectator.query('[data-testid="message-date"]')).toBeTruthy();
    });

    it('omits the date when the message carries none', () => {
        render(createMessage({ createdAt: undefined }));

        expect(spectator.query('[data-testid="message-date"]')).toBeNull();
    });

    it('links a reply to the message it answers', () => {
        render(createMessage({ id: 7, parentId: 3 }), 42);

        const link = spectator.query('[data-testid="message-reply-to"]');
        expect(link).toHaveText('в ответ на');
        expect(link?.getAttribute('href')).toBe('/forum/topic/42/3');
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
});
