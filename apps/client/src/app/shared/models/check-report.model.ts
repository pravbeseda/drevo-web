import { CheckFinding, CheckLevel } from '@drevo-web/editor';

/** `full` checks the whole version, `changes` only the lines it changed against the previous one. */
export type CheckScope = 'full' | 'changes';

export type CheckVerdict = 'clean' | 'fix' | 'serious';

export type CheckCounts = Readonly<Record<CheckLevel, number>>;

export interface CheckReportItem extends CheckFinding {
    readonly fragment: string;
    /** 1-based line of the fragment in the version's source. */
    readonly line: number;
    /** The line was added or edited in this version. */
    readonly isChanged: boolean;
    readonly contextBefore: string;
    readonly contextAfter: string;
}

/** The raw source of a version and of the one before it; a first version has none before it. */
export interface VersionTexts {
    readonly current: string;
    readonly previous: string | undefined;
}

export interface CheckReport {
    readonly scope: CheckScope;
    readonly items: readonly CheckReportItem[];
    readonly verdict: CheckVerdict;
    readonly counts: CheckCounts;
}
