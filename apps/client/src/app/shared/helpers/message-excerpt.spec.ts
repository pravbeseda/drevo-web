import { messageExcerpt } from './message-excerpt';
import { ForumMessage } from '@drevo-web/shared';

function createMessage(html: string): ForumMessage {
    return { id: 1, parentId: undefined, author: { name: 'А', login: undefined }, createdAt: undefined, html };
}

describe('messageExcerpt', () => {
    it('reads the message as one line of text', () => {
        expect(messageExcerpt(createMessage('<p>Первая</p><p>Вторая</p>'), document)).toBe('Первая Вторая');
    });

    it('cuts a long message to what one line can show', () => {
        expect(messageExcerpt(createMessage(`<p>${'а'.repeat(500)}</p>`), document)).toHaveLength(200);
    });
});
