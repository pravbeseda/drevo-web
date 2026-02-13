import { DiffMatchPatchEngine } from './diff-match-patch.engine';
import type { DiffEngine } from './diff.types';
import { JsDiffEngine } from './js-diff.engine';

export interface DiffEngineEntry {
    readonly id: string;
    readonly label: string;
    readonly engine: DiffEngine;
}

export const DIFF_ENGINES: readonly DiffEngineEntry[] = [
    { id: 'js-diff', label: 'JsDiff', engine: new JsDiffEngine() },
    {
        id: 'diff-match-patch',
        label: 'DiffMatchPatch',
        engine: new DiffMatchPatchEngine(),
    },
];
