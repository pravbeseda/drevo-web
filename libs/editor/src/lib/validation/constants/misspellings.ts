export interface Misspelling {
    /** Regex source matched as whole words, case-insensitively. */
    readonly pattern: string;
    readonly message: string;
    readonly suggestion?: string;
}

// «в течении реки» is correct, so «в течении» is an error only when time follows, possibly after a numeral.
const TIME_WORDS = [
    'года',
    'лет',
    'дня',
    'дней',
    'суток',
    'недели',
    'недель',
    'месяца',
    'месяцев',
    'часа',
    'часов',
    'минуты',
    'минут',
    'века',
    'веков',
    'столетия',
    'столетий',
    'десятилетия',
    'десятилетий',
    'жизни',
    'времени',
    'периода',
    'срока',
    'поста',
].join('|');

const STRAY_LOZHIT = '«Ложить» без приставки не употребляется, правильно «класть»';

export const MISSPELLINGS: readonly Misspelling[] = [
    {
        pattern: 'ихн(?:ий|его|ему|им|ем|яя|ей|юю|ие|их|ими)',
        message: '«Ихний» — просторечие, правильно «их»',
        suggestion: 'их',
    },
    { pattern: 'ложить', message: STRAY_LOZHIT, suggestion: 'класть' },
    // «ложу» is left out: it is also «ложа» in the accusative («в ложу»).
    { pattern: 'лож(?:ишь|ит|им|ите|ат|ил[аио]?)', message: STRAY_LOZHIT },
    {
        pattern: `в течении(?=\\s+(?:[\\p{L}\\d]+\\s+)?(?:${TIME_WORDS})(?!\\p{L}))`,
        message: '«В течение» (о времени) пишется с «е» на конце',
        suggestion: 'в течение',
    },
    {
        pattern: 'вследствии',
        message: '«Вследствие» (по причине) пишется с «е» на конце',
        suggestion: 'вследствие',
    },
    { pattern: 'во?общем', message: 'Пишется раздельно: «в общем»', suggestion: 'в общем' },
    { pattern: 'вобще', message: 'Правильно «вообще»', suggestion: 'вообще' },
    { pattern: 'тоесть', message: 'Пишется раздельно: «то есть»', suggestion: 'то есть' },
    { pattern: 'впринципе', message: 'Пишется раздельно: «в принципе»', suggestion: 'в принципе' },
    { pattern: 'ввиде', message: 'Пишется раздельно: «в виде»', suggestion: 'в виде' },
    { pattern: 'в кратце', message: 'Пишется слитно: «вкратце»', suggestion: 'вкратце' },
    { pattern: 'извените', message: 'Правильно «извините»', suggestion: 'извините' },
];
