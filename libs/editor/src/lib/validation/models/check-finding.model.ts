export type CheckCategory = 'markup' | 'spelling' | 'grammar' | 'style' | 'lexicon';

export type CheckLevel = 'serious' | 'fix' | 'hint';

export interface CheckFinding {
    readonly from: number;
    readonly to: number;
    readonly message: string;
    readonly ruleId: string;
    readonly category: CheckCategory;
    readonly level: CheckLevel;
    readonly suggestion?: string;
    /** The AI's probability that the problem is there; only AI findings carry it. */
    readonly probability?: number;
}
