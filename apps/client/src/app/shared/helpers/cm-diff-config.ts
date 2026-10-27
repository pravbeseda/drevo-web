import { Change, DiffConfig, diff } from '@codemirror/merge';
import type { DiffChange, DiffEngine } from '@drevo-web/shared/diff';

/** Shared by the diff view and the moderation check, so both see the same changed lines. */
export const CM_DIFF_CONFIG: DiffConfig = {
    scanLimit: 10_000_000,
    timeout: 15000,
};

/** The diff config that lets `engine` compute the changes CodeMirror draws; without one, CodeMirror's own diff. */
export function cmDiffConfig(engine: DiffEngine | undefined): DiffConfig {
    if (!engine) return CM_DIFF_CONFIG;
    return {
        ...CM_DIFF_CONFIG,
        override: (a, b) => toCmChanges(a, b, engine.computeDiff(a, b)) ?? diff(a, b, CM_DIFF_CONFIG),
    };
}

// Nothing when the pieces do not rebuild both texts, since their offsets would drift.
function toCmChanges(a: string, b: string, pieces: readonly DiffChange[]): Change[] | undefined {
    if (joinSide(pieces, 'insert') !== a || joinSide(pieces, 'delete') !== b) return undefined;

    const changes: Change[] = [];
    let posA = 0;
    let posB = 0;
    for (const { type, text } of pieces) {
        const fromA = posA;
        const fromB = posB;
        if (type !== 'insert') posA += text.length;
        if (type !== 'delete') posB += text.length;
        if (type === 'equal') continue;

        // A deletion and an insertion side by side are one replacement.
        const last = changes.at(-1);
        if (last?.toA === fromA && last.toB === fromB) {
            changes[changes.length - 1] = new Change(last.fromA, posA, last.fromB, posB);
        } else {
            changes.push(new Change(fromA, posA, fromB, posB));
        }
    }
    return changes;
}

function joinSide(pieces: readonly DiffChange[], otherSide: DiffChange['type']): string {
    return pieces
        .filter(piece => piece.type !== otherSide)
        .map(piece => piece.text)
        .join('');
}
