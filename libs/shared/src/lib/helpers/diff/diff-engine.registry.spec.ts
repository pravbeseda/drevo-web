import { DIFF_ENGINES } from './diff-engine.registry';

describe('DIFF_ENGINES', () => {
    it('registers both engines under the ids the UI persists', () => {
        expect(DIFF_ENGINES.map(entry => entry.id)).toEqual(['js-diff', 'diff-match-patch']);
    });

    it('gives every entry a label to show in the picker', () => {
        for (const entry of DIFF_ENGINES) {
            expect(entry.label).toBeTruthy();
        }
    });

    it('registers engines that compute a diff', () => {
        for (const entry of DIFF_ENGINES) {
            expect(entry.engine.computeDiff('a', 'b')).toEqual(expect.any(Array));
        }
    });
});
