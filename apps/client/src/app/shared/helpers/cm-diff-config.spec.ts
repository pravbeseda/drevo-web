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

    it('should read the whitespace inside an inserted piece', () => {
        const onFallback = jest.fn();
        const engine = engineOf([
            { type: 'equal', text: 'один ' },
            { type: 'insert', text: 'два три' },
        ]);

        const changes = diff('один ', 'один два три', cmDiffConfig(engine, onFallback));

        expect(changes.map(c => [c.fromA, c.toA, c.fromB, c.toB])).toEqual([[5, 5, 5, 12]]);
        expect(onFallback).not.toHaveBeenCalled();
    });

    // JsDiff ignores whitespace and puts the new text's whitespace into its unchanged pieces.
    it.each([
        ['a joined line', 'один два\nтри', 'один два три', [[8, 9, 8, 9]]],
        ['a removed double space', 'один  два', 'один два', [[4, 6, 4, 5]]],
        ['a removed space before a comma', 'слово , дело', 'слово, дело', [[5, 6, 5, 5]]],
        ['an added trailing newline', 'один два', 'один два\n', [[8, 8, 8, 9]]],
        ['a removed trailing newline', 'один два\n', 'один два', [[8, 9, 8, 8]]],
        ['an insertion whose space JsDiff left unchanged', 'Марии)).', 'Марии)) Константинопольских.', [[7, 7, 7, 27]]],
    ])('should draw %s as a change of its own', (_, oldText, newText, expected) => {
        const onFallback = jest.fn();

        const changes = diff(oldText, newText, cmDiffConfig(new JsDiffEngine(), onFallback));

        expect(changes.map(c => [c.fromA, c.toA, c.fromB, c.toB])).toEqual(expected);
        expect(onFallback).not.toHaveBeenCalled();
    });

    it.each([
        ['a removed mark', 'а ́кот', 'а кот', [[2, 3, 2, 2]]],
        ['an added mark', 'а кот', 'а ́кот', [[2, 2, 2, 3]]],
        ['a mark added at the end', 'кот', 'кот ́', [[3, 3, 3, 5]]],
        ['a mark removed at the end', 'кот ́', 'кот', [[3, 5, 3, 3]]],
    ])('should draw %s JsDiff dropped as a change', (_, oldText, newText, expected) => {
        const onFallback = jest.fn();

        const changes = diff(oldText, newText, cmDiffConfig(new JsDiffEngine(), onFallback));

        expect(changes.map(c => [c.fromA, c.toA, c.fromB, c.toB])).toEqual(expected);
        expect(onFallback).not.toHaveBeenCalled();
    });

    it.each([
        ['before a space', 'слово ́ дело', 'слово ́ дело', []],
        ['before a line break', 'слово ́\nдело', 'слово ́\nтело', [[6, 12, 6, 12]]],
    ])('should step over a mark JsDiff dropped %s', (_, oldText, newText, expected) => {
        const onFallback = jest.fn();

        const changes = diff(oldText, newText, cmDiffConfig(new JsDiffEngine(), onFallback));

        expect(changes.map(c => [c.fromA, c.toA, c.fromB, c.toB])).toEqual(expected);
        expect(onFallback).not.toHaveBeenCalled();
    });

    it("should fall back to CodeMirror's diff and report it when the pieces do not match the texts", () => {
        const onFallback = jest.fn();
        const engine = engineOf([{ type: 'equal', text: 'другой текст' }]);

        const changes = diff('старый', 'новый', cmDiffConfig(engine, onFallback));

        expect(changes).toEqual(diff('старый', 'новый', CM_DIFF_CONFIG));
        expect(onFallback).toHaveBeenCalledTimes(1);
    });
});
