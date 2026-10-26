export type AiLocateModel = 'haiku' | 'luna';

export interface AiLocateModelInfo {
    /** OpenRouter id, pinned: the answer cache is keyed by it. */
    readonly id: string;
    readonly label: string;
}

export const AI_LOCATE_MODELS: Readonly<Record<AiLocateModel, AiLocateModelInfo>> = {
    haiku: { id: 'anthropic/claude-haiku-5.5', label: 'Haiku' },
    luna: { id: 'openai/gpt-6-luna', label: 'Luna' },
};

/** One problem a model found, `quote` copied from the paragraph it was given. */
export interface AiLocatedError {
    readonly quote: string;
    readonly suggestion?: string;
    readonly explanation: string;
}
