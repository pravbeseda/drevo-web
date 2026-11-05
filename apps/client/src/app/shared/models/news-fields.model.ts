/** What a news item being created needs besides its text. */
export interface NewsFields {
    readonly title: string;
    /** `YYYY-MM-DD` */
    readonly newsDate: string;
    /** The section; absent until one is picked. */
    readonly topic: number | undefined;
}
