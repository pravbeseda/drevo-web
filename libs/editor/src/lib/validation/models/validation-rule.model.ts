import { CheckCategory } from './check-finding.model';

export interface RuleMatch {
    readonly from: number;
    readonly to: number;
    readonly message: string;
    readonly suggestion?: string;
}

export interface ValidationRule {
    readonly id: string;
    readonly defaultSeverity: 'error' | 'warning';
    readonly category: CheckCategory;
    validate(text: string): readonly RuleMatch[];
}
