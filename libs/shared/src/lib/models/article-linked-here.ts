export interface ArticleLinkedHereItem {
    readonly id: number;
    readonly title: string;
    readonly highlightedTitle?: string;
}

export interface ArticleLinkedHereResponse {
    readonly items: readonly ArticleLinkedHereItem[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

export interface ArticleLinkedHereParams {
    readonly title: string;
    readonly query?: string;
    readonly page?: number;
    readonly pageSize?: number;
}
