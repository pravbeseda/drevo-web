export interface Topic {
    readonly id: number;
    readonly name: string;
    readonly icon: string;
}

export const TOPICS: readonly Topic[] = [
    { id: 1, name: 'Персоналии', icon: 'topic_person' },
    { id: 2, name: 'Организации', icon: 'topic_group' },
    { id: 3, name: 'География', icon: 'topic_place' },
    { id: 4, name: 'Термины, понятия', icon: 'topic_term' },
    { id: 5, name: 'Монастыри, храмы, некрополи', icon: 'topic_church' },
    { id: 6, name: 'Библейский словарь', icon: 'topic_bible' },
    { id: 7, name: 'Библиографический словарь', icon: 'topic_books' },
    { id: 8, name: 'Святыни', icon: 'topic_cross' },
    { id: 9, name: 'Памятные события, праздники', icon: 'topic_sparkles' },
    { id: 10, name: 'Церковнославянский', icon: 'topic_cslav' },
    { id: 11, name: 'Документы', icon: 'topic_document' },
    { id: 13, name: 'Тексты с комментариями', icon: 'topic_file-text' },
    { id: 14, name: 'Календарь', icon: 'topic_event' },
    { id: 15, name: 'Хронология', icon: 'topic_clock' },
    { id: 16, name: 'Служебные статьи', icon: 'topic_file-cog' },
];

export function getTopicIconPath(icon: string): string {
    return `/img/topics/${icon}.svg`;
}

export function getTopicsByIds(ids: readonly number[]): readonly Topic[] {
    return TOPICS.filter(t => ids.includes(t.id));
}
