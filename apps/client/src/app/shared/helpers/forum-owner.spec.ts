import { forumOwnerPrefix } from './forum-owner';

describe('forumOwnerPrefix', () => {
    it('names a news item by its section', () => {
        expect(forumOwnerPrefix('news')).toBe('к новости');
    });

    it.each([['articles'], ['common'], [undefined]])('names anything else an article (%s)', sectionId => {
        expect(forumOwnerPrefix(sectionId)).toBe('к статье');
    });
});
