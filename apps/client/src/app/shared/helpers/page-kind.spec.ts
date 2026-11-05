import { diffUrl, pageUrl, versionUrl } from './page-kind';

describe('page kind helpers', () => {
    it('addresses a page under its kind', () => {
        expect(pageUrl('articles', 5)).toBe('/articles/5');
        expect(pageUrl('news', 7)).toBe('/news/7');
    });

    it('addresses a version under its page', () => {
        expect(versionUrl('articles', 5, 50)).toBe('/articles/5/version/50');
        expect(versionUrl('news', 7, 70)).toBe('/news/7/version/70');
    });

    it('addresses the diff of a version against the one before it', () => {
        expect(diffUrl('articles', 50)).toBe('/history/articles/diff/50');
        expect(diffUrl('news', 70)).toBe('/history/news/diff/70');
    });

    it('addresses the diff of two versions', () => {
        expect(diffUrl('news', 69, 70)).toBe('/history/news/diff/69/70');
    });
});
