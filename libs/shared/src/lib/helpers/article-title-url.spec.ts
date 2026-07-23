import { decodeArticleTitle, encodeArticleTitle } from './article-title-url';

describe('article title url helpers', () => {
    describe('encodeArticleTitle', () => {
        it('should replace spaces with plus', () => {
            expect(encodeArticleTitle('ВИФСАИДА ГАЛИЛЕЙСКАЯ')).toBe('ВИФСАИДА+ГАЛИЛЕЙСКАЯ');
        });

        it('should not percent-encode cyrillic', () => {
            expect(encodeArticleTitle('ВИФСАИДА')).toBe('ВИФСАИДА');
        });

        it('should leave percent sign untouched', () => {
            expect(encodeArticleTitle('100% воды')).toBe('100%+воды');
        });

        it('should return empty string as is', () => {
            expect(encodeArticleTitle('')).toBe('');
        });
    });

    describe('decodeArticleTitle', () => {
        it('should replace plus with spaces', () => {
            expect(decodeArticleTitle('ВИФСАИДА+ГАЛИЛЕЙСКАЯ')).toBe('ВИФСАИДА ГАЛИЛЕЙСКАЯ');
        });

        it('should replace every plus', () => {
            expect(decodeArticleTitle('a+b+c')).toBe('a b c');
        });
    });

    it('should round-trip a title', () => {
        const title = 'ВИФСАИДА ГАЛИЛЕЙСКАЯ (город)';
        expect(decodeArticleTitle(encodeArticleTitle(title))).toBe(title);
    });
});
