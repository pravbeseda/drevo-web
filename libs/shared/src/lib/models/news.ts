export interface NewsTopic {
    readonly id: number;
    readonly title: string;
}

export interface CreateNewsRequest {
    readonly title: string;
    /** `YYYY-MM-DD` */
    readonly newsDate: string;
    readonly topic: number;
    readonly content: string;
    readonly info?: string;
}

/** What a moderator may change about a news item besides its text. */
export interface NewsMetaChange {
    readonly title?: string;
    /** `YYYY-MM-DD` */
    readonly newsDate?: string;
    readonly topic?: number;
    readonly rank?: number;
    readonly numlist?: number;
}

export interface NewsMeta {
    readonly articleId: number;
    readonly title: string;
    readonly newsDate: Date | undefined;
    readonly topics: readonly number[];
    readonly rank: number;
    readonly numlist: number;
}
