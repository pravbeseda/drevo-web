/** A pick-one question of the System One API; `criteria` maps each option to the description Jev reads. */
export interface JevChoiceQuestion {
    readonly type: 'choice';
    readonly instructions: string;
    readonly criteria: Readonly<Record<string, string>>;
}

export interface JevChoiceAnswer {
    readonly type: 'choice';
    readonly choice: string;
    readonly confidence: number;
    readonly probabilities: Readonly<Record<string, number>>;
}

export interface JevRequest {
    readonly model: string;
    readonly state: string;
    readonly questions: Readonly<Record<string, JevChoiceQuestion>>;
}

export interface JevResponse {
    readonly model: string;
    readonly answers: Readonly<Partial<Record<string, JevChoiceAnswer>>>;
}
