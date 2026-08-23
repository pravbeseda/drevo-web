import { getTopicIconPath, getTopicsByIds, TOPICS } from './topic';

describe('getTopicIconPath', () => {
    it('builds the path the icon registry is given', () => {
        expect(getTopicIconPath('topic_person')).toBe('/img/topics/topic_person.svg');
    });
});

describe('getTopicsByIds', () => {
    it('returns the topics the ids name, in registry order', () => {
        expect(getTopicsByIds([3, 1]).map(topic => topic.name)).toEqual(['Персоналии', 'География']);
    });

    it('drops an id no topic carries — 12 is absent from the table', () => {
        expect(getTopicsByIds([12])).toEqual([]);
    });

    it('returns nothing for an empty selection', () => {
        expect(getTopicsByIds([])).toEqual([]);
    });

    it('resolves every id the table declares', () => {
        expect(getTopicsByIds(TOPICS.map(topic => topic.id))).toHaveLength(TOPICS.length);
    });
});
