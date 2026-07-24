import { decodeArticleTitle, encodeArticleTitle } from './article-title-url';

describe('article title url helpers', () => {
    // The backend emits /articles/find/<rawurlencode(title)> (space -> %20,
    // '+' -> %2B) and the Angular router percent-encodes/decodes the segment
    // losslessly, so these helpers must be verbatim pass-throughs. A lossy
    // space<->'+' mapping would corrupt titles carrying a literal '+', e.g. the
    // death marker in "… (+ 1919)".
    const titles = ['ВИФСАИДА ГАЛИЛЕЙСКАЯ', 'C++', 'РОЖДЕСТВЕНСКИЙ НИКОЛАЙ ИВАНОВИЧ (+ 1919)', '100% воды', ''];

    describe('encodeArticleTitle', () => {
        it.each(titles)('should leave %p untouched', title => {
            expect(encodeArticleTitle(title)).toBe(title);
        });
    });

    describe('decodeArticleTitle', () => {
        it.each(titles)('should leave %p untouched', param => {
            expect(decodeArticleTitle(param)).toBe(param);
        });
    });

    it.each(titles)('should round-trip %p', title => {
        expect(decodeArticleTitle(encodeArticleTitle(title))).toBe(title);
    });
});
