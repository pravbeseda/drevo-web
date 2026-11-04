import { findAll } from './find-all';
import { MISSPELLINGS } from '../constants/misspellings';
import { maskNonProse } from '../mask';
import { findMixedScriptWords, isScriptLetter, MixedScriptWord } from '../mixed-script-words';
import { RuleMatch, ValidationRule } from '../models/validation-rule.model';

const MISSPELLING_REGEXES = MISSPELLINGS.map(entry => ({
    ...entry,
    regex: new RegExp(`(?<!\\p{L})(?:${entry.pattern})(?!\\p{L})`, 'giu'),
}));

// A hyphen on either side makes it part of a compound: «что что-то» is no repeat.
const REPEATED_WORD_REGEX = /(?<![\p{L}-])(\p{L}+)[ \t]+\1(?![\p{L}-])/giu;
const DELIBERATE_REPEATS: ReadonlySet<string> = new Set([
    'так',
    'да',
    'нет',
    'ну',
    'ой',
    'ах',
    'ох',
    'эх',
    'ха',
    'тук',
    'свят',
]);

// Latin letters that look like a Cyrillic one, as ConfusableSkeleton.php pairs them for the spam filter.
const LOOKALIKES: readonly (readonly [latin: string, cyrillic: string])[] = [
    ['a', 'а'],
    ['c', 'с'],
    ['e', 'е'],
    ['i', 'і'],
    ['k', 'к'],
    ['o', 'о'],
    ['p', 'р'],
    ['x', 'х'],
    ['y', 'у'],
    ['A', 'А'],
    ['B', 'В'],
    ['C', 'С'],
    ['E', 'Е'],
    ['H', 'Н'],
    ['I', 'І'],
    ['K', 'К'],
    ['M', 'М'],
    ['O', 'О'],
    ['P', 'Р'],
    ['T', 'Т'],
    ['X', 'Х'],
    ['Y', 'У'],
];
const LATIN_TO_CYRILLIC: ReadonlyMap<string, string> = new Map(LOOKALIKES);
const CYRILLIC_TO_LATIN: ReadonlyMap<string, string> = new Map(
    LOOKALIKES.map(([latin, cyrillic]) => [cyrillic, latin]),
);

function matchCase(suggestion: string, original: string): string {
    const first = original.charAt(0);
    return first === first.toLocaleUpperCase('ru') && first !== first.toLocaleLowerCase('ru')
        ? suggestion.charAt(0).toLocaleUpperCase('ru') + suggestion.slice(1)
        : suggestion;
}

export const commonMisspellings: ValidationRule = {
    id: 'common-misspellings',
    defaultSeverity: 'warning',
    category: 'spelling',
    validate(text: string): readonly RuleMatch[] {
        const masked = maskNonProse(text);
        return MISSPELLING_REGEXES.flatMap(({ regex, message, suggestion }) =>
            findAll(masked, regex, message).map(match => ({
                ...match,
                suggestion: suggestion && matchCase(suggestion, text.slice(match.from, match.to)),
            })),
        );
    },
};

export const repeatedWord: ValidationRule = {
    id: 'repeated-word',
    defaultSeverity: 'warning',
    category: 'spelling',
    validate(text: string): readonly RuleMatch[] {
        return Array.from(maskNonProse(text).matchAll(REPEATED_WORD_REGEX))
            .filter(match => !DELIBERATE_REPEATS.has(match[1].toLocaleLowerCase('ru')))
            .map(match => ({
                from: match.index,
                to: match.index + match[0].length,
                message: `Слово повторяется: «${match[0]}»`,
                suggestion: match[1],
            }));
    },
};

function toSingleScript({ text, minority }: MixedScriptWord): string | undefined {
    const table = minority === 'latin' ? LATIN_TO_CYRILLIC : CYRILLIC_TO_LATIN;
    const converted = Array.from(text, letter => (isScriptLetter(letter, minority) ? table.get(letter) : letter));

    return converted.every(letter => letter !== undefined) ? converted.join('') : undefined;
}

export const mixedScript: ValidationRule = {
    id: 'mixed-script',
    defaultSeverity: 'warning',
    category: 'spelling',
    validate(text: string): readonly RuleMatch[] {
        return findMixedScriptWords(text).map(word => ({
            from: word.from,
            to: word.from + word.text.length,
            message: 'Латинские и русские буквы в одном слове',
            suggestion: toSingleScript(word),
        }));
    },
};
