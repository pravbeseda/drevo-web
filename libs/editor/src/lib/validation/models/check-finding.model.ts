export type CheckCategory = 'markup' | 'spelling' | 'style' | 'lexicon';

export type CheckLevel = 'serious' | 'fix' | 'hint';

export interface CheckFinding {
    readonly from: number;
    readonly to: number;
    readonly message: string;
    readonly ruleId: string;
    readonly category: CheckCategory;
    readonly level: CheckLevel;
    readonly suggestion?: string;
}
