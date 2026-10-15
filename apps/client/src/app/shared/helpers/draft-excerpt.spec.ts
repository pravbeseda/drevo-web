import { draftExcerpt } from './draft-excerpt';

describe('draftExcerpt', () => {
    it('reads the draft as one line of text', () => {
        expect(draftExcerpt('Первая строка\n\n  Вторая  ')).toBe('Первая строка Вторая');
    });

    it('leaves out the quoted lines, which are someone else’s words', () => {
        expect(draftExcerpt('> Иван писал\n> > раньше\n\nМой ответ')).toBe('Мой ответ');
    });

    it('names a draft that holds only a quote', () => {
        expect(draftExcerpt('> Иван писал\n\n')).toBe('цитата');
    });

    it('cuts a long draft to what one line can show', () => {
        expect(draftExcerpt('а'.repeat(500))).toHaveLength(200);
    });
});
