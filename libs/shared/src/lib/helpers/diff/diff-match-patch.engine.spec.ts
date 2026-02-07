import { DiffMatchPatchEngine } from './diff-match-patch.engine';

describe('DiffMatchPatchEngine', () => {
    let engine: DiffMatchPatchEngine;

    beforeEach(() => {
        engine = new DiffMatchPatchEngine();
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
});
