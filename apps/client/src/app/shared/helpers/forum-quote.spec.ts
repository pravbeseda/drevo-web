import { quoteForumText } from './forum-quote';

describe('quoteForumText', () => {
    it('marks every line that has text as quoted and keeps the blank ones', () => {
        expect(quoteForumText('Первая\n  Вторая\n\nТретья')).toBe('> Первая\n> Вторая\n\n> Третья');
    });

    it('takes a line already quoted one level deeper', () => {
        expect(quoteForumText('> цитата\nответ')).toBe('> > цитата\n> ответ');
    });

    it('drops the lines that would go deeper than two levels', () => {
        expect(quoteForumText('> > > давнее\n> > первая\n> вторая\nответ')).toBe('> > вторая\n> ответ');
    });

    it('quotes nothing in an empty text', () => {
        expect(quoteForumText('')).toBe('');
    });
});
