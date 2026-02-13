export type JsDiffGranularity = 'chars' | 'words' | 'wordsWithSpace' | 'lines' | 'sentences';

export interface JsDiffOptions {
    readonly granularity: JsDiffGranularity;
    readonly ignoreCase: boolean;
    readonly intlSegmenter: boolean;
    readonly stripTrailingCr: boolean;
    readonly newlineIsToken: boolean;
    readonly ignoreNewlineAtEof: boolean;
    readonly ignoreWhitespace: boolean;
}

export const DEFAULT_JS_DIFF_OPTIONS: JsDiffOptions = {
    granularity: 'words',
    ignoreCase: false,
    intlSegmenter: true,
    stripTrailingCr: false,
    newlineIsToken: false,
    ignoreNewlineAtEof: false,
    ignoreWhitespace: false,
};

export interface DiffChange {
    readonly type: 'equal' | 'insert' | 'delete';
    readonly text: string;
}

export interface DiffEngine {
    computeDiff(oldText: string, newText: string, options?: JsDiffOptions): DiffChange[];
}
