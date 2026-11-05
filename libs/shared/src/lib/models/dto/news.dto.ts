/** A news section (GET /api/news/topics). */
export interface NewsTopicDto {
    readonly id: number;
    readonly title: string;
}

/** Request body of POST /api/news/create. */
export interface CreateNewsRequestDto {
    readonly title: string;
    /** `YYYY-MM-DD` */
    readonly newsDate: string;
    readonly topic: number;
    readonly content: string;
    readonly info?: string;
}

/** Request body of POST /api/news/{id}/meta (moderator only); at least one field. */
export interface NewsMetaRequestDto {
    readonly title?: string;
    /** `YYYY-MM-DD` */
    readonly newsDate?: string;
    readonly topic?: number;
    readonly rank?: number;
    /** 0 — the next mailing, 1 — not mailed. */
    readonly numlist?: number;
}

export interface NewsMetaResponseDto {
    readonly articleId: number;
    readonly title: string;
    readonly newsDate: string | null;
    readonly topics: readonly number[];
    readonly rank: number;
    readonly numlist: number;
}
