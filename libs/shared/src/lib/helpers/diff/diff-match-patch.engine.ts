import type { DiffChange, DiffEngine } from './diff.types';
import DiffMatchPatch from 'diff-match-patch';

const DIFF_DELETE = -1;
const DIFF_INSERT = 1;
const DIFF_EQUAL = 0;

const DIFF_TYPE_MAP: Record<number, DiffChange['type']> = {
    [DIFF_EQUAL]: 'equal',
    [DIFF_INSERT]: 'insert',
    [DIFF_DELETE]: 'delete',
};

export class DiffMatchPatchEngine implements DiffEngine {
    computeDiff(oldText: string, newText: string): DiffChange[] {
        const dmp = new DiffMatchPatch();
        const diffs = dmp.diff_main(oldText, newText);
        dmp.diff_cleanupSemantic(diffs);

        return diffs.map((diff: [number, string]) => ({
            type: DIFF_TYPE_MAP[diff[0]],
            text: diff[1],
        }));
    }
}
