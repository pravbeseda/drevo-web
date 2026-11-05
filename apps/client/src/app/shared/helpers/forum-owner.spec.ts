import { forumOwnerKind, forumOwnerPrefix } from './forum-owner';

describe('forumOwnerPrefix', () => {
    it('names a news item by its section', () => {
        expect(forumOwnerPrefix('news')).toBe('к новости');
    });

    it.each([['articles'], ['common'], [undefined]])('names anything else an article (%s)', sectionId => {
        expect(forumOwnerPrefix(sectionId)).toBe('к статье');
    });
});

describe('forumOwnerKind', () => {
    it('reads a topic of the news section as one about a news item', () => {
        expect(forumOwnerKind('news')).toBe('news');
    });

    it.each([['articles'], ['common'], [undefined]])('reads anything else as one about an article (%s)', sectionId => {
        expect(forumOwnerKind(sectionId)).toBe('articles');
    });
});
