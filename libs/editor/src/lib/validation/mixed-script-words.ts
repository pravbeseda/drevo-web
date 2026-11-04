import { maskNonProse } from './mask';

export type Script = 'latin' | 'cyrillic';

export interface MixedScriptWord {
    readonly from: number;
    readonly text: string;
    /** The alphabet with fewer letters in the word; a tie counts Latin as the stray one. */
    readonly minority: Script;
}

const WORD_REGEX = /\p{L}+/gu;
const SCRIPT_LETTER: Readonly<Record<Script, RegExp>> = {
    latin: /\p{Script=Latin}/u,
    cyrillic: /\p{Script=Cyrillic}/u,
};
// «XIXв» is a century with a missing space, not a word in two alphabets.
const ROMAN_NUMERAL_WITH_SUFFIX = /^[IVXLCDM]+\p{Script=Cyrillic}+$/u;

export function isScriptLetter(letter: string, script: Script): boolean {
    return SCRIPT_LETTER[script].test(letter);
}

function minorityOf(word: string): Script {
    const letters = Array.from(word);
    const count = (script: Script): number => letters.filter(letter => isScriptLetter(letter, script)).length;
    return count('cyrillic') >= count('latin') ? 'latin' : 'cyrillic';
}

/** Words of the prose that mix Latin and Cyrillic letters. */
export function findMixedScriptWords(text: string): readonly MixedScriptWord[] {
    return Array.from(maskNonProse(text).matchAll(WORD_REGEX))
        .filter(
            ([word]) =>
                SCRIPT_LETTER.latin.test(word) &&
                SCRIPT_LETTER.cyrillic.test(word) &&
                !ROMAN_NUMERAL_WITH_SUFFIX.test(word),
        )
        .map(match => ({ from: match.index, text: match[0], minority: minorityOf(match[0]) }));
}
