export interface ContentError {
    readonly from: number;
    readonly to: number;
    readonly message: string;
    readonly severity: 'error' | 'warning';
    readonly ruleId: string;
}
