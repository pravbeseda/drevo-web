import { ArticleVersion } from '@drevo-web/shared';

export type VersionForModeration = Pick<ArticleVersion, 'versionId' | 'approved' | 'comment' | 'author' | 'date'>;
