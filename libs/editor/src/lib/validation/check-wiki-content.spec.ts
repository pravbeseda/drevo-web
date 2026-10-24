import { CHECK_LEVELS } from './check-levels';
import { checkWikiContent } from './check-wiki-content';
import { CheckFinding } from './models/check-finding.model';

function byRule(text: string, ruleId: string): readonly CheckFinding[] {
    return checkWikiContent(text).filter(f => f.ruleId === ruleId);
}

function fragments(text: string, ruleId: string): readonly string[] {
    return byRule(text, ruleId).map(f => text.slice(f.from, f.to));
}

describe('checkWikiContent', () => {
    it('should return no findings for clean text', () => {
        expect(checkWikiContent('Обычный текст без ошибок.')).toEqual([]);
    });

    it('should report an unpaired bracket as a serious markup finding', () => {
        const text = 'Текст (без пары';
        const findings = checkWikiContent(text);

        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({
            ruleId: 'paired-brackets',
            category: 'markup',
            level: 'serious',
            message: 'Нет закрывающей скобки )',
        });
        expect(text.slice(findings[0].from, findings[0].to)).toBe('(');
    });

    it('should report a link in a heading as a serious markup finding', () => {
        const findings = checkWikiContent('== Заголовок ((ссылка)) ==');

        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({ ruleId: 'heading-no-links', category: 'markup', level: 'serious' });
    });

    describe('empty-markup', () => {
        it('should report empty links, footnotes and categories', () => {
            const text = 'См. (()), сноска [[ ]] и категория {{}}.';

            expect(fragments(text, 'empty-markup')).toEqual(['(())', '[[ ]]', '{{}}']);
            expect(byRule(text, 'empty-markup')[0]).toMatchObject({
                category: 'markup',
                message: 'Пустая ссылка (())',
            });
        });

        it('should not report filled markup', () => {
            expect(byRule('((Сергий)) [[Житие]] {{Святые}}', 'empty-markup')).toEqual([]);
        });
    });

    describe('unclosed-comment', () => {
        it('should report a comment without its closing marker', () => {
            const text = 'Текст [* заметка без конца';

            expect(fragments(text, 'unclosed-comment')).toEqual(['[*']);
            expect(byRule(text, 'unclosed-comment')[0].message).toBe('Комментарий [* не закрыт: нет *]');
        });

        it('should report a comment that swallows the next comment opener', () => {
            const text = 'А [* первый. Б [* второй *] В';

            expect(fragments(text, 'unclosed-comment')).toEqual(['[*']);
            expect(byRule(text, 'unclosed-comment')[0].from).toBe(2);
            expect(byRule(text, 'unclosed-comment')[0].message).toBe(
                'Комментарий [* закрывается только после следующего [* — текст между ними скроется',
            );
        });

        it('should report a footnote that starts with bold', () => {
            const text = 'Текст[[*жирный*]] дальше';
            const [finding] = byRule(text, 'unclosed-comment');

            expect(text.slice(finding.from, finding.to)).toBe('[[*');
            expect(finding.suggestion).toBe('[[ *');
        });

        it('should not report a proper comment', () => {
            expect(byRule('Текст [* заметка *] дальше', 'unclosed-comment')).toEqual([]);
        });

        it('should ignore comment markers inside nowiki and inline code', () => {
            expect(byRule('<nowiki>[* не комментарий</nowiki> и `[*`', 'unclosed-comment')).toEqual([]);
        });

        it('should keep one finding where the bracket rule reports the same position', () => {
            const findings = checkWikiContent('А [* первый. Б [* второй *] В').filter(f => f.from === 2);

            expect(findings.map(f => f.ruleId)).toEqual(['unclosed-comment']);
        });
    });

    describe('common-misspellings', () => {
        it.each([
            ['ихний дом', 'ихний', 'их'],
            ['Ихнего сына', 'Ихнего', 'Их'],
            ['ложить книгу', 'ложить', 'класть'],
            ['в течении года', 'в течении', 'в течение'],
            ['В течении трёх дней', 'В течении', 'В течение'],
            ['вследствии болезни', 'вследствии', 'вследствие'],
            ['вообщем ясно', 'вообщем', 'в общем'],
            ['тоесть так', 'тоесть', 'то есть'],
        ])('should report «%s»', (text, fragment, suggestion) => {
            const [finding] = byRule(text, 'common-misspellings');

            expect(text.slice(finding.from, finding.to)).toBe(fragment);
            expect(finding).toMatchObject({ category: 'spelling', level: 'serious', suggestion });
        });

        it('should report a form without a suggestion when no single replacement fits', () => {
            const [finding] = byRule('он ложит книгу', 'common-misspellings');

            expect(finding.suggestion).toBeUndefined();
        });

        it.each(['в течении реки', 'положить книгу', 'их дом', 'вкратце'])('should not report «%s»', text => {
            expect(byRule(text, 'common-misspellings')).toEqual([]);
        });

        it('should ignore words inside a URL', () => {
            expect(byRule('См. !https://example.org/ihniy/ихний', 'common-misspellings')).toEqual([]);
        });
    });

    describe('repeated-word', () => {
        it('should report the same word twice in a row', () => {
            const text = 'Он ушёл в в лес и и вернулся.';
            const findings = byRule(text, 'repeated-word');

            expect(fragments(text, 'repeated-word')).toEqual(['в в', 'и и']);
            expect(findings[0]).toMatchObject({ category: 'spelling', suggestion: 'в' });
        });

        it('should report a repeat that differs only in case', () => {
            expect(fragments('Он Он пришёл', 'repeated-word')).toEqual(['Он Он']);
        });

        it.each(['Свят, свят, свят', 'так так', 'да да', 'еле-еле', 'в\nв'])('should not report «%s»', text => {
            expect(byRule(text, 'repeated-word')).toEqual([]);
        });
    });

    describe('mixed-script', () => {
        it('should report a Russian word with a Latin lookalike and suggest the Cyrillic spelling', () => {
            const text = 'Преподобный cвятой Сергий';
            const [finding] = byRule(text, 'mixed-script');

            expect(text.slice(finding.from, finding.to)).toBe('cвятой');
            expect(finding).toMatchObject({ category: 'spelling', level: 'serious', suggestion: 'святой' });
        });

        it('should suggest the Latin spelling for a mostly Latin word', () => {
            const [finding] = byRule('ОС Windоws', 'mixed-script');

            expect(finding.suggestion).toBe('Windows');
        });

        it('should report without a suggestion when a letter has no lookalike', () => {
            const [finding] = byRule('слоvо', 'mixed-script');

            expect(finding.suggestion).toBeUndefined();
        });

        it.each(['святой Sergius', 'XIXв', 'e-mail-рассылка', 'см. https://site.ru/svyatoй'])(
            'should not report «%s»',
            text => {
                expect(byRule(text, 'mixed-script')).toEqual([]);
            },
        );
    });
});

describe('CHECK_LEVELS', () => {
    it('should map every category to its moderation level', () => {
        expect(CHECK_LEVELS).toEqual({
            markup: 'serious',
            spelling: 'serious',
            style: 'fix',
            lexicon: 'hint',
        });
    });
});
