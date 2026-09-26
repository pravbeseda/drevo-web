import { htmlToText } from './html-to-text';

describe('htmlToText', () => {
    it('keeps the text of inline markup and drops the tags', () => {
        expect(htmlToText('<p>См. <a href="/articles/1">статью</a> о <b>лавре</b></p>', document)).toBe(
            'См. статью о лавре',
        );
    });

    it('keeps adjacent blocks apart as words', () => {
        expect(
            htmlToText('<p>Согласен.</p><blockquote>Цитата</blockquote><ul><li>один</li><li>два</li></ul>', document),
        ).toBe('Согласен. Цитата один два');
    });

    it('treats a line break as a space', () => {
        expect(htmlToText('первая<br>вторая', document)).toBe('первая вторая');
    });

    it('decodes entities', () => {
        expect(htmlToText('<p>&laquo;Житие&raquo;&nbsp;&mdash; источник</p>', document)).toBe('«Житие» — источник');
    });

    it('collapses the whitespace the markup was formatted with', () => {
        expect(htmlToText('<p>\n    Текст\n    сообщения\n</p>', document)).toBe('Текст сообщения');
    });
});
