import type { DiffChange, DiffEngine, JsDiffOptions } from './diff.types';
import { DEFAULT_JS_DIFF_OPTIONS } from './diff.types';
import type { Change } from 'diff';
import { diffChars, diffLines, diffSentences, diffWords, diffWordsWithSpace } from 'diff';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IntlSegmenter = (Intl as any).Segmenter;

function createWordSegmenter(): unknown {
    return IntlSegmenter ? new IntlSegmenter(undefined, { granularity: 'word' }) : undefined;
}

export class JsDiffEngine implements DiffEngine {
    computeDiff(oldText: string, newText: string, options: JsDiffOptions = DEFAULT_JS_DIFF_OPTIONS): DiffChange[] {
        const changes = this.computeChanges(oldText, newText, options);

        return changes.map(change => ({
            type: change.added ? 'insert' : change.removed ? 'delete' : 'equal',
            text: change.value,
        }));
    }

    private computeChanges(oldText: string, newText: string, options: JsDiffOptions): Change[] {
        switch (options.granularity) {
            case 'chars':
                return diffChars(oldText, newText, {
                    ignoreCase: options.ignoreCase,
                });
            case 'words':
                return diffWords(oldText, newText, {
                    ignoreCase: options.ignoreCase,
                    intlSegmenter: options.intlSegmenter ? createWordSegmenter() : undefined,
                });
            case 'wordsWithSpace':
                return diffWordsWithSpace(oldText, newText, {
                    ignoreCase: options.ignoreCase,
                    intlSegmenter: options.intlSegmenter ? createWordSegmenter() : undefined,
                });
            case 'lines':
                return diffLines(oldText, newText, {
                    stripTrailingCr: options.stripTrailingCr,
                    newlineIsToken: options.newlineIsToken,
                    ignoreNewlineAtEof: options.ignoreNewlineAtEof,
                    ignoreWhitespace: options.ignoreWhitespace,
                });
            case 'sentences':
                return diffSentences(oldText, newText);
        }
    }
}
