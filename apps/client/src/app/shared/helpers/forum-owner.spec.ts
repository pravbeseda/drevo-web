import { forumOwnerKind, forumOwnerPrefix, forumSectionOf } from './forum-owner';

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

describe('forumSectionOf', () => {
    it.each([
        ['articles', 'articles'],
        ['news', 'news'],
    ] as const)('names the forum section that holds the discussions of %s', (kind, section) => {
        expect(forumSectionOf(kind)).toBe(section);
    });

    it.each([['articles'], ['news']] as const)('is the inverse of forumOwnerKind for %s', kind => {
        expect(forumOwnerKind(forumSectionOf(kind))).toBe(kind);
    });
});
