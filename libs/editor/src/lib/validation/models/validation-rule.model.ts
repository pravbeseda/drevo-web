export interface RuleMatch {
    readonly from: number;
    readonly to: number;
    readonly message: string;
}

export interface ValidationRule {
    readonly id: string;
    readonly defaultSeverity: 'error' | 'warning';
    validate(text: string): readonly RuleMatch[];
}
