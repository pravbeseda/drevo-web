import { diff } from '@codemirror/merge';
import { DiffChange, DiffEngine } from '@drevo-web/shared/diff';
import { CM_DIFF_CONFIG, cmDiffConfig } from './cm-diff-config';

function engineOf(changes: DiffChange[]): DiffEngine {
    return { computeDiff: () => changes };
}

function rangesOf(oldText: string, newText: string, engine: DiffEngine): readonly number[][] {
    return diff(oldText, newText, cmDiffConfig(engine)).map(c => [c.fromA, c.toA, c.fromB, c.toB]);
}

describe('cmDiffConfig', () => {
    it('should leave the diff to CodeMirror without an engine', () => {
        expect(cmDiffConfig(undefined)).toBe(CM_DIFF_CONFIG);
    });

    it('should place an insertion and a deletion of the engine in both texts', () => {
        const engine = engineOf([
            { type: 'equal', text: 'один ' },
            { type: 'insert', text: 'новый ' },
            { type: 'equal', text: 'два ' },
            { type: 'delete', text: 'три' },
        ]);

        expect(rangesOf('один два три', 'один новый два ', engine)).toEqual([
            [5, 5, 5, 11],
            [9, 12, 15, 15],
        ]);
    });

    it('should join a deletion and an insertion next to each other into one replacement', () => {
        const engine = engineOf([
            { type: 'equal', text: 'было ' },
            { type: 'delete', text: 'старое' },
            { type: 'insert', text: 'новое' },
            { type: 'equal', text: ' слово' },
        ]);

        expect(rangesOf('было старое слово', 'было новое слово', engine)).toEqual([[5, 11, 5, 10]]);
    });

    it("should fall back to CodeMirror's diff when the engine's pieces do not add up to the texts", () => {
        // JsDiff strips combining marks after whitespace, so its pieces can be shorter than the text.
        const engine = engineOf([
            { type: 'equal', text: 'а б' },
            { type: 'insert', text: 'в' },
        ]);
        const oldText = 'а ́б';
        const newText = 'а ́бв';

        expect(rangesOf(oldText, newText, engine)).toEqual(
            diff(oldText, newText, CM_DIFF_CONFIG).map(c => [c.fromA, c.toA, c.fromB, c.toB]),
        );
    });
});
