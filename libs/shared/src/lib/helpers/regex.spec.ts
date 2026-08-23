import { assertIsDefined } from './assert';
import { optionalGroup } from './regex';

describe('optionalGroup', () => {
    const pattern = /(?:==(.+?)==)|(?:=(.+?)=)/;

    it('should return the text of a group the pattern filled', () => {
        const match = pattern.exec('==Heading==');
        assertIsDefined(match, 'pattern should match');

        expect(optionalGroup(match, 1)).toBe('Heading');
    });

    it('should return undefined for a group the pattern left empty', () => {
        const match = pattern.exec('==Heading==');
        assertIsDefined(match, 'pattern should match');

        expect(optionalGroup(match, 2)).toBeUndefined();
    });

    it('should return undefined for an index beyond the captured groups', () => {
        const match = pattern.exec('==Heading==');
        assertIsDefined(match, 'pattern should match');

        expect(optionalGroup(match, 9)).toBeUndefined();
    });
});
