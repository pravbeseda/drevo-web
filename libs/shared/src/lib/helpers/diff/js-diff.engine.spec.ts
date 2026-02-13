import type { JsDiffOptions } from './diff.types';
import { DEFAULT_JS_DIFF_OPTIONS } from './diff.types';
import { JsDiffEngine } from './js-diff.engine';

describe('JsDiffEngine', () => {
    let engine: JsDiffEngine;

    beforeEach(() => {
        engine = new JsDiffEngine();
    });

    it('should return equal for identical texts', () => {
        const result = engine.computeDiff('hello world', 'hello world');
        expect(result).toEqual([{ type: 'equal', text: 'hello world' }]);
    });

    it('should detect insertion', () => {
        const result = engine.computeDiff('hello', 'hello world');
        const insertChanges = result.filter(c => c.type === 'insert');
        expect(insertChanges.length).toBeGreaterThan(0);
        const insertedText = insertChanges.map(c => c.text).join('');
        expect(insertedText).toContain('world');
    });

    it('should detect deletion', () => {
        const result = engine.computeDiff('hello world', 'hello');
        const deleteChanges = result.filter(c => c.type === 'delete');
        expect(deleteChanges.length).toBeGreaterThan(0);
        const deletedText = deleteChanges.map(c => c.text).join('');
        expect(deletedText).toContain('world');
    });

    it('should detect replacement', () => {
        const result = engine.computeDiff('hello world', 'hello planet');
        const hasDelete = result.some(c => c.type === 'delete');
        const hasInsert = result.some(c => c.type === 'insert');
        expect(hasDelete).toBe(true);
        expect(hasInsert).toBe(true);
    });

    it('should handle empty old text', () => {
        const result = engine.computeDiff('', 'new text');
        expect(result).toEqual([{ type: 'insert', text: 'new text' }]);
    });

    it('should handle empty new text', () => {
        const result = engine.computeDiff('old text', '');
        expect(result).toEqual([{ type: 'delete', text: 'old text' }]);
    });

    it('should handle both empty texts', () => {
        const result = engine.computeDiff('', '');
        expect(result).toEqual([]);
    });

    it('should preserve newlines in diff output', () => {
        const result = engine.computeDiff('line1\nline2', 'line1\nline3');
        const allText = result.map(c => c.text).join('');
        expect(allText).toContain('line1');
    });

    describe('granularity modes', () => {
        const opts = (
            overrides: Partial<JsDiffOptions>
        ): JsDiffOptions => ({
            ...DEFAULT_JS_DIFF_OPTIONS,
            ...overrides,
        });

        it('should diff by characters', () => {
            const result = engine.computeDiff('abc', 'aXc', opts({ granularity: 'chars' }));
            const deleted = result.filter(c => c.type === 'delete').map(c => c.text).join('');
            const inserted = result.filter(c => c.type === 'insert').map(c => c.text).join('');
            expect(deleted).toBe('b');
            expect(inserted).toBe('X');
        });

        it('should diff by words', () => {
            const result = engine.computeDiff(
                'hello world foo',
                'hello planet foo',
                opts({ granularity: 'words' })
            );
            const deleted = result.filter(c => c.type === 'delete').map(c => c.text).join('');
            const inserted = result.filter(c => c.type === 'insert').map(c => c.text).join('');
            expect(deleted).toContain('world');
            expect(inserted).toContain('planet');
        });

        it('should diff by wordsWithSpace', () => {
            const result = engine.computeDiff(
                'hello world',
                'hello  world',
                opts({ granularity: 'wordsWithSpace' })
            );
            // wordsWithSpace treats whitespace as significant
            const hasChanges = result.some(
                c => c.type === 'insert' || c.type === 'delete'
            );
            expect(hasChanges).toBe(true);
        });

        it('should diff by lines', () => {
            const result = engine.computeDiff(
                'line1\nline2\nline3\n',
                'line1\nchanged\nline3\n',
                opts({ granularity: 'lines' })
            );
            const deleted = result.filter(c => c.type === 'delete').map(c => c.text).join('');
            const inserted = result.filter(c => c.type === 'insert').map(c => c.text).join('');
            expect(deleted).toContain('line2');
            expect(inserted).toContain('changed');
        });

        it('should diff by sentences', () => {
            const result = engine.computeDiff(
                'First sentence. Second sentence.',
                'First sentence. Changed sentence.',
                opts({ granularity: 'sentences' })
            );
            const deleted = result.filter(c => c.type === 'delete').map(c => c.text).join('');
            const inserted = result.filter(c => c.type === 'insert').map(c => c.text).join('');
            expect(deleted).toContain('Second');
            expect(inserted).toContain('Changed');
        });
    });

    describe('options', () => {
        const opts = (
            overrides: Partial<JsDiffOptions>
        ): JsDiffOptions => ({
            ...DEFAULT_JS_DIFF_OPTIONS,
            ...overrides,
        });

        it('should respect ignoreCase for chars', () => {
            const withCase = engine.computeDiff('Hello', 'hello', opts({ granularity: 'chars' }));
            const withoutCase = engine.computeDiff(
                'Hello',
                'hello',
                opts({ granularity: 'chars', ignoreCase: true })
            );

            const withCaseHasChanges = withCase.some(
                c => c.type !== 'equal'
            );
            const withoutCaseHasChanges = withoutCase.some(
                c => c.type !== 'equal'
            );

            expect(withCaseHasChanges).toBe(true);
            expect(withoutCaseHasChanges).toBe(false);
        });

        it('should respect ignoreCase for words', () => {
            const withCase = engine.computeDiff(
                'Hello World',
                'hello world',
                opts({ granularity: 'words' })
            );
            const withoutCase = engine.computeDiff(
                'Hello World',
                'hello world',
                opts({ granularity: 'words', ignoreCase: true })
            );

            const withCaseHasChanges = withCase.some(
                c => c.type !== 'equal'
            );
            const withoutCaseHasChanges = withoutCase.some(
                c => c.type !== 'equal'
            );

            expect(withCaseHasChanges).toBe(true);
            expect(withoutCaseHasChanges).toBe(false);
        });

        it('should respect ignoreWhitespace for lines', () => {
            const withWs = engine.computeDiff(
                'line1\n  line2\n',
                'line1\nline2\n',
                opts({ granularity: 'lines' })
            );
            const withoutWs = engine.computeDiff(
                'line1\n  line2\n',
                'line1\nline2\n',
                opts({ granularity: 'lines', ignoreWhitespace: true })
            );

            const withWsHasChanges = withWs.some(c => c.type !== 'equal');
            const withoutWsHasChanges = withoutWs.some(
                c => c.type !== 'equal'
            );

            expect(withWsHasChanges).toBe(true);
            expect(withoutWsHasChanges).toBe(false);
        });

        it('should respect stripTrailingCr for lines', () => {
            const withCr = engine.computeDiff(
                'line1\r\nline2\r\n',
                'line1\nline2\n',
                opts({ granularity: 'lines' })
            );
            const withoutCr = engine.computeDiff(
                'line1\r\nline2\r\n',
                'line1\nline2\n',
                opts({ granularity: 'lines', stripTrailingCr: true })
            );

            const withCrHasChanges = withCr.some(c => c.type !== 'equal');
            const withoutCrHasChanges = withoutCr.some(
                c => c.type !== 'equal'
            );

            expect(withCrHasChanges).toBe(true);
            expect(withoutCrHasChanges).toBe(false);
        });
    });
});
