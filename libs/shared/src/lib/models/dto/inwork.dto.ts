export interface InworkCheckResponseDto {
    readonly editor?: string;
}

export interface InworkItemDto {
    readonly id: number;
    readonly module: string;
    readonly title: string;
    readonly author: string;
    readonly lasttime: string;
    readonly age: number;
}
