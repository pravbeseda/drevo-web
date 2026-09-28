import { quoteForumText } from './forum-quote';

describe('quoteForumText', () => {
    it('marks every line that has text as quoted and keeps the blank ones', () => {
        expect(quoteForumText('Первая\n  Вторая\n\nТретья')).toBe('> Первая\n> Вторая\n\n> Третья');
    });

    it('quotes nothing in an empty text', () => {
        expect(quoteForumText('')).toBe('');
    });
});
