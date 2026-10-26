import { CheckCategory } from '@drevo-web/editor';

/** The categories Jev's questionnaire asks about, so the ones an AI card can carry. */
export type AiCheckCategory = Extract<CheckCategory, 'spelling' | 'grammar' | 'style'>;

/** A source line's prose and its place in the version's source. */
export interface ProseLine {
    /** 1-based line number. */
    readonly line: number;
    readonly from: number;
    readonly to: number;
    readonly text: string;
}

/** The probabilities, 0 to 1, from which an AI answer becomes a finding at its category's level and a hint. */
export interface AiThresholds {
    readonly finding: number;
    readonly hint: number;
}
