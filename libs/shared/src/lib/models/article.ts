export interface Article {
    readonly articleId: number;
    readonly title: string;
}

export interface ArticleVersion extends Article {
    readonly versionId: number;
    readonly content: string;
    readonly author: string;
    readonly date: Date;
    readonly redirect: boolean;
    readonly new: boolean;
    readonly approved: number;
    readonly info: string;
    readonly comment: string;
}
