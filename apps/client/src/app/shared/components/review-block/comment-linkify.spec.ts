import { linkifyComment } from './comment-linkify';

describe('linkifyComment', () => {
    it('returns a single plain-text segment when there is no link', () => {
        expect(linkifyComment('просто текст')).toEqual([{ text: 'просто текст' }]);
    });

    it('turns an http(s) URL into a link segment', () => {
        expect(linkifyComment('см. https://example.com')).toEqual([
            { text: 'см. ' },
            { text: 'https://example.com', href: 'https://example.com' },
        ]);
    });

    it('keeps trailing sentence punctuation out of the link', () => {
        expect(linkifyComment('ссылка https://example.com.')).toEqual([
            { text: 'ссылка ' },
            { text: 'https://example.com', href: 'https://example.com' },
            { text: '.' },
        ]);
    });

    it('strips an unbalanced closing paren that wraps the link', () => {
        expect(linkifyComment('(https://example.com)')).toEqual([
            { text: '(' },
            { text: 'https://example.com', href: 'https://example.com' },
            { text: ')' },
        ]);
    });

    it('keeps a balanced closing paren that belongs to the URL', () => {
        const url = 'https://ru.wikipedia.org/wiki/Москва_(значения)';
        expect(linkifyComment(`см. ${url}`)).toEqual([{ text: 'см. ' }, { text: url, href: url }]);
    });

    it('keeps a balanced paren even with trailing sentence punctuation', () => {
        const url = 'https://ru.wikipedia.org/wiki/Москва_(значения)';
        expect(linkifyComment(`${url}.`)).toEqual([{ text: url, href: url }, { text: '.' }]);
    });

    it('linkifies multiple URLs in one comment', () => {
        expect(linkifyComment('a https://one.com b https://two.com')).toEqual([
            { text: 'a ' },
            { text: 'https://one.com', href: 'https://one.com' },
            { text: ' b ' },
            { text: 'https://two.com', href: 'https://two.com' },
        ]);
    });
});
