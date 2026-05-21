export interface ArticleLinkedHereItemDto {
    readonly id: number;
    readonly title: string;
    readonly highlightedTitle?: string;
}

export interface ArticleLinkedHereResponseDto {
    readonly items: readonly ArticleLinkedHereItemDto[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}
