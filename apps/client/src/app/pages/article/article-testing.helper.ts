import { ArticleVersion } from '@drevo-web/shared';

export function createMockArticle(overrides: Partial<ArticleVersion> = {}): ArticleVersion {
    return {
        articleId: 123,
        versionId: 456,
        title: 'Test Article',
        content: '<p>Content</p>',
        author: 'Author',
        date: new Date('2024-01-15'),
        redirect: false,
        new: false,
        approved: 1,
        info: '',
        comment: '',
        ...overrides,
    };
}
