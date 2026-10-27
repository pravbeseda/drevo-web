import { Change, DiffConfig, diff } from '@codemirror/merge';
import type { DiffChange, DiffEngine } from '@drevo-web/shared/diff';

/** Shared by the diff view and the moderation check, so both see the same changed lines. */
export const CM_DIFF_CONFIG: DiffConfig = {
    scanLimit: 10_000_000,
    timeout: 15000,
};

const COMBINING_MARK = /\p{M}/u;

/**
 * The diff config that lets `engine` compute the changes CodeMirror draws; without one, CodeMirror's own diff.
 * When the engine's pieces do not match the texts, CodeMirror's diff is drawn and `onFallback` is told.
 */
export function cmDiffConfig(engine: DiffEngine | undefined, onFallback?: () => void): DiffConfig {
    if (!engine) return CM_DIFF_CONFIG;
    return {
        ...CM_DIFF_CONFIG,
        override: (a, b) => {
            const changes = toCmChanges(a, b, engine.computeDiff(a, b));
            if (changes) return changes;
            onFallback?.();
            return diff(a, b, CM_DIFF_CONFIG);
        },
    };
}

// Nothing when the pieces do not match both texts, since their offsets would drift.
function toCmChanges(a: string, b: string, pieces: readonly DiffChange[]): Change[] | undefined {
    const changes: Change[] = [];
    let posA = 0;
    let posB = 0;
    for (const { type, text } of pieces) {
        const toA = type === 'insert' ? posA : advance(a, posA, text);
        const toB = type === 'delete' ? posB : advance(b, posB, text);
        if (toA === undefined || toB === undefined) return undefined;

        if (type !== 'equal') addChange(changes, new Change(posA, toA, posB, toB));
        posA = toA;
        posB = toB;
    }
    return skipMarks(a, posA) === a.length && skipMarks(b, posB) === b.length ? changes : undefined;
}

// A deletion and an insertion side by side are one replacement.
function addChange(changes: Change[], change: Change): void {
    const last = changes.at(-1);
    if (last?.toA === change.fromA && last.toB === change.fromB) {
        changes[changes.length - 1] = new Change(last.fromA, change.toA, last.fromB, change.toB);
    } else {
        changes.push(change);
    }
}

// Where `text` ends in `source` read from `pos`, stepping over the combining marks the engine dropped
// (JsDiff strips them after whitespace); nothing on any other mismatch.
function advance(source: string, pos: number, text: string): number | undefined {
    let at = pos;
    for (const char of text) {
        if (!source.startsWith(char, at)) at = skipMarks(source, at);
        if (!source.startsWith(char, at)) return undefined;
        at += char.length;
    }
    return at;
}

function skipMarks(source: string, pos: number): number {
    let at = pos;
    while (at < source.length && COMBINING_MARK.test(source[at])) at++;
    return at;
}
