import { pairedBrackets } from './bracket-rules';
import { headingNoFootnotes, headingNoFormatting, headingNoLinks } from './heading-rules';
import { emptyMarkup, unclosedComment } from './markup-rules';
import { commonMisspellings, mixedScript, repeatedWord } from './spelling-rules';
import { ValidationRule } from '../models/validation-rule.model';

// Order is priority: where two rules report the same position, moderation keeps the earlier, more specific one.
export const ALL_RULES: readonly ValidationRule[] = [
    headingNoLinks,
    headingNoFormatting,
    headingNoFootnotes,
    unclosedComment,
    pairedBrackets,
    emptyMarkup,
    commonMisspellings,
    repeatedWord,
    mixedScript,
];
