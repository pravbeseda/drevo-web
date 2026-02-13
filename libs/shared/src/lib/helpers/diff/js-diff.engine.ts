import type { DiffChange, DiffEngine, JsDiffOptions } from './diff.types';
import { DEFAULT_JS_DIFF_OPTIONS } from './diff.types';
import type { Change } from 'diff';
import { diffChars, diffLines, diffSentences, diffWords, diffWordsWithSpace } from 'diff';

function createWordSegmenter(): Intl.Segmenter | undefined {
    return typeof Intl.Segmenter !== 'undefined' ? new Intl.Segmenter(undefined, { granularity: 'word' }) : undefined;
}

// Workaround for jsdiff bug: Intl.Segmenter treats "space + combining mark" as a single
// non-word segment, but diffWords' postProcess assumes space is always a separate suffix.
// Orphaned combining marks (after whitespace) are wiki-markup artifacts with no visual effect.
const stripOrphanedCombiningMarks = (text: string): string => text.replace(/(\s)[\u0300-\u036F\u0483-\u0489]+/g, '$1');

export class JsDiffEngine implements DiffEngine {
    computeDiff(oldText: string, newText: string, options: JsDiffOptions = DEFAULT_JS_DIFF_OPTIONS): DiffChange[] {
        const changes = this.computeChanges(
            stripOrphanedCombiningMarks(oldText),
            stripOrphanedCombiningMarks(newText),
            options
        );

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
