import { diff } from '@codemirror/merge';
import { DiffChange, DiffEngine, JsDiffEngine } from '@drevo-web/shared/diff';
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

    // CodeMirror's own diff would replace the single letter, so the whole word comes from the engine;
    // the dropped mark goes with the piece after it.
    it('should step over the combining marks JsDiff drops after whitespace', () => {
        expect(rangesOf('а ́кот', 'а ́кит', new JsDiffEngine())).toEqual([[2, 6, 2, 6]]);
    });

    it('should step over a combining mark dropped at the end of the text', () => {
        const engine = engineOf([
            { type: 'equal', text: 'а ' },
            { type: 'delete', text: 'кот' },
            { type: 'insert', text: 'кит' },
            { type: 'equal', text: ' ' },
        ]);

        expect(rangesOf('а кот ́', 'а кит ́', engine)).toEqual([[2, 5, 2, 5]]);
    });

    it("should fall back to CodeMirror's diff and report it when the pieces do not match the texts", () => {
        const onFallback = jest.fn();
        const engine = engineOf([{ type: 'equal', text: 'другой текст' }]);

        const changes = diff('старый', 'новый', cmDiffConfig(engine, onFallback));

        expect(changes).toEqual(diff('старый', 'новый', CM_DIFF_CONFIG));
        expect(onFallback).toHaveBeenCalledTimes(1);
    });
});
