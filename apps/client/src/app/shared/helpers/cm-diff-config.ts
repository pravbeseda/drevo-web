import { Change, DiffConfig, diff } from '@codemirror/merge';
import type { DiffChange, DiffEngine } from '@drevo-web/shared/diff';

/** Shared by the diff view and the moderation check, so both see the same changed lines. */
export const CM_DIFF_CONFIG: DiffConfig = {
    scanLimit: 10_000_000,
    timeout: 15000,
};

const COMBINING_MARK = /\p{M}/u;
const SPACE = /\s/;

interface Cursor {
    readonly source: string;
    at: number;
}

interface Run {
    readonly from: number;
    readonly to: number;
}

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
    const cursorA: Cursor = { source: a, at: 0 };
    const cursorB: Cursor = { source: b, at: 0 };
    for (const { type, text } of pieces) {
        const fromA = cursorA.at;
        const fromB = cursorB.at;
        if (type === 'equal') {
            // JsDiff ignores whitespace and drops some marks, so what an unchanged piece reads differently is a change.
            const read = advance(text, [cursorA, cursorB], ([gapA, gapB]) => addGap(changes, a, b, gapA, gapB));
            if (!read) return undefined;
        } else {
            if (!advance(text, [type === 'insert' ? cursorB : cursorA])) return undefined;
            addChange(changes, new Change(fromA, cursorA.at, fromB, cursorB.at));
        }
    }
    if (skipMarks(a, cursorA.at) !== a.length || skipMarks(b, cursorB.at) !== b.length) return undefined;
    addGap(changes, a, b, { from: cursorA.at, to: a.length }, { from: cursorB.at, to: b.length });
    return changes;
}

function addGap(changes: Change[], a: string, b: string, gapA: Run, gapB: Run): void {
    if (a.slice(gapA.from, gapA.to) !== b.slice(gapB.from, gapB.to)) {
        addChange(changes, new Change(gapA.from, gapA.to, gapB.from, gapB.to));
    }
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

// Moves every cursor past `text`, false on a mismatch. A whitespace run may differ from the text's,
// and the combining marks the engine dropped (JsDiff strips them after whitespace) are stepped over;
// `onGap` gets each cursor's run of either.
function advance(text: string, cursors: readonly Cursor[], onGap?: (runs: readonly Run[]) => void): boolean {
    let i = 0;
    while (i < text.length) {
        if (SPACE.test(text[i]) || cursors.some(({ source, at }) => SPACE.test(source.charAt(at)))) {
            i = skip(text, i, SPACE);
            const runs = cursors.map(readSpace);
            onGap?.(runs);
        } else if (cursors.some(cursor => atDroppedMark(cursor, text[i]))) {
            // Whitespace may follow the marks, so the loop looks at it again.
            const runs = cursors.map(cursor => readDroppedMarks(cursor, text[i]));
            onGap?.(runs);
        } else {
            if (!cursors.every(cursor => readChar(cursor, text[i]))) return false;
            i++;
        }
    }
    return true;
}

function readSpace(cursor: Cursor): Run {
    const from = cursor.at;
    cursor.at = skip(cursor.source, from, SPACE);
    return { from, to: cursor.at };
}

function atDroppedMark({ source, at }: Cursor, char: string): boolean {
    return source[at] !== char && COMBINING_MARK.test(source.charAt(at));
}

function readDroppedMarks(cursor: Cursor, char: string): Run {
    const from = cursor.at;
    if (atDroppedMark(cursor, char)) cursor.at = skipMarks(cursor.source, from);
    return { from, to: cursor.at };
}

function readChar(cursor: Cursor, char: string): boolean {
    if (cursor.source[cursor.at] !== char) return false;
    cursor.at++;
    return true;
}

function skipMarks(source: string, pos: number): number {
    return skip(source, pos, COMBINING_MARK);
}

function skip(source: string, pos: number, chars: RegExp): number {
    let at = pos;
    while (at < source.length && chars.test(source[at])) at++;
    return at;
}
