import { REVIEW_TARGET } from './page-kind';

describe('REVIEW_TARGET', () => {
    it('names the review target of each page kind', () => {
        expect(REVIEW_TARGET).toEqual({ articles: 'article', news: 'news' });
    });
});
