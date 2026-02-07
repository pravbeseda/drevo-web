import type { DiffChange, DiffEngine } from './diff.types';
import { diffWords } from 'diff';

export class JsDiffEngine implements DiffEngine {
    computeDiff(oldText: string, newText: string): DiffChange[] {
        const changes = diffWords(oldText, newText);

        return changes.map(change => ({
            type: change.added ? 'insert' : change.removed ? 'delete' : 'equal',
            text: change.value,
        }));
    }
}
