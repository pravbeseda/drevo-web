export interface FilterOption<T extends string = string> {
    readonly key: T;
    readonly label: string;
}

export interface FilterGroup<T extends string = string> {
    readonly label: string;
    readonly items: readonly FilterOption<T>[];
}

export type FilterEntry<T extends string = string> = FilterOption<T> | FilterGroup<T>;

export function isFilterGroup<T extends string>(entry: FilterEntry<T>): entry is FilterGroup<T> {
    return 'items' in entry;
}
