import { CM_DIFF_CONFIG } from './cm-diff-config';
import { CheckCounts, CheckReport, CheckReportItem, CheckScope, CheckVerdict } from '../models/check-report.model';
import { diff } from '@codemirror/merge';
import { Text } from '@codemirror/state';
import { checkWikiContent } from '@drevo-web/editor';

const MAX_CONTEXT_SIDE = 100;
const ELLIPSIS = '…';
// A sentence ends where the next one starts with a capital, so «ок. 1314» and «г. до» stay inside it.
const SENTENCE_BREAK = /[.!?…]\s+(?=[\p{Lu}«"(])/gu;
const SENTENCE_END = /[.!?…](?=\s|$)/u;

export function buildCheckReport(current: string, previous: string | undefined, scope: CheckScope): CheckReport {
    const doc = Text.of(current.split('\n'));
    const changedLines = previous === undefined ? undefined : findChangedLines(doc, previous, current);

    const items = checkWikiContent(current)
        .map((finding): CheckReportItem => {
            const line = doc.lineAt(finding.from);
            return {
                ...finding,
                fragment: current.slice(finding.from, finding.to),
                line: line.number,
                isChanged: changedLines?.has(line.number) ?? true,
                ...sentenceContext(line.text, finding.from - line.from, finding.to - line.from),
            };
        })
        .filter(item => scope === 'full' || item.isChanged)
        .sort((a, b) => a.from - b.from);

    const counts: CheckCounts = {
        serious: items.filter(item => item.level === 'serious').length,
        fix: items.filter(item => item.level === 'fix').length,
        hint: items.filter(item => item.level === 'hint').length,
    };

    return { scope, items, verdict: toVerdict(counts), counts };
}

/** Hints never change the light: only serious findings and fixes do. */
export function toVerdict(counts: CheckCounts): CheckVerdict {
    if (counts.serious > 0) return 'serious';
    return counts.fix > 0 ? 'fix' : 'clean';
}

// A change counts against the lines whose text it touches; a newline at its edge belongs to no line,
// so appending or removing whole lines leaves their neighbours unchanged.
function findChangedLines(doc: Text, previous: string, current: string): ReadonlySet<number> {
    const lines = new Set<number>();
    for (const change of diff(previous, current, CM_DIFF_CONFIG)) {
        if (change.toB > change.fromB) {
            for (let n = doc.lineAt(change.fromB).number; n <= doc.lineAt(change.toB).number; n++) {
                const line = doc.line(n);
                if (Math.max(change.fromB, line.from) < Math.min(change.toB, line.to)) lines.add(n);
            }
            continue;
        }

        const removed = previous.slice(change.fromA, change.toA);
        const line = doc.lineAt(change.fromB);
        const removedWholeLines =
            (removed.startsWith('\n') && change.fromB === line.to) ||
            (removed.endsWith('\n') && change.fromB === line.from);
        if (!removedWholeLines) lines.add(line.number);
    }
    return lines;
}

function sentenceContext(
    line: string,
    from: number,
    to: number,
): Pick<CheckReportItem, 'contextBefore' | 'contextAfter'> {
    const head = line.slice(0, from);
    const start = Array.from(head.matchAll(SENTENCE_BREAK)).at(-1);
    const tail = line.slice(to);
    const end = SENTENCE_END.exec(tail);

    return {
        contextBefore: trimStart(start ? head.slice(start.index + start[0].length) : head),
        contextAfter: trimEnd(end ? tail.slice(0, end.index + 1) : tail),
    };
}

function trimStart(text: string): string {
    return text.length > MAX_CONTEXT_SIDE ? ELLIPSIS + text.slice(-MAX_CONTEXT_SIDE).replace(/^\S*\s/u, '') : text;
}

function trimEnd(text: string): string {
    return text.length > MAX_CONTEXT_SIDE ? text.slice(0, MAX_CONTEXT_SIDE).replace(/\s\S*$/u, '') + ELLIPSIS : text;
}
