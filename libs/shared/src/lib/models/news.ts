export interface NewsTopic {
    readonly id: number;
    readonly title: string;
}

export interface NewsListItem {
    readonly id: number;
    readonly title: string;
    readonly newsDate: Date | undefined;
}

/** A page of news, with the total across every page. */
export interface NewsListPage {
    readonly items: readonly NewsListItem[];
    readonly total: number;
}

export interface CreateNewsRequest {
    readonly title: string;
    /** `YYYY-MM-DD` */
    readonly newsDate: string;
    readonly topic: number;
    readonly content: string;
    readonly info?: string;
}

/** What a moderator changes about a news item besides its text: its title, day and section. */
export interface NewsMetaChange {
    readonly title?: string;
    /** `YYYY-MM-DD` */
    readonly newsDate?: string;
    readonly topic?: number;
}

export interface NewsMeta {
    readonly articleId: number;
    readonly title: string;
    readonly newsDate: Date | undefined;
    readonly topics: readonly number[];
}
