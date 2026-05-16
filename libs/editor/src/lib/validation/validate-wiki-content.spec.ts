import { validateWikiContent } from './validate-wiki-content';

describe('validateWikiContent', () => {
    describe('heading-no-links', () => {
        it('should detect links in h2 headings', () => {
            const text = '== Заголовок ((ссылка)) ==';
            const errors = validateWikiContent(text);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toMatchObject({
                message: 'Ссылки запрещены в заголовках',
                severity: 'warning',
                ruleId: 'heading-no-links',
            });
            expect(text.slice(errors[0].from, errors[0].to)).toBe('((ссылка))');
        });

        it('should detect links in headings without spaces', () => {
            const text = '==*Каноническое* ((устройство))==';
            const errors = validateWikiContent(text).filter(e => e.ruleId === 'heading-no-links');

            expect(errors).toHaveLength(1);
            expect(text.slice(errors[0].from, errors[0].to)).toBe('((устройство))');
        });

        it('should detect links in headings with picture prefix', () => {
            const text = '@7225@ ==*Каноническое* ((устройство))==';
            const errors = validateWikiContent(text).filter(e => e.ruleId === 'heading-no-links');

            expect(errors).toHaveLength(1);
            expect(text.slice(errors[0].from, errors[0].to)).toBe('((устройство))');
        });

        it('should detect links in h3 headings', () => {
            const text = '=== Заголовок ((ссылка)) ===';
            const errors = validateWikiContent(text);

            expect(errors).toHaveLength(1);
            expect(errors[0].ruleId).toBe('heading-no-links');
        });

        it('should detect multiple links in one heading', () => {
            const text = '== ((первая)) и ((вторая)) ==';
            const errors = validateWikiContent(text).filter(e => e.ruleId === 'heading-no-links');

            expect(errors).toHaveLength(2);
        });

        it('should not flag links outside headings', () => {
            const text = 'Обычный текст с ((ссылкой)) внутри.';
            const errors = validateWikiContent(text);

            expect(errors).toHaveLength(0);
        });
    });

    describe('heading-no-formatting', () => {
        it('should detect bold in headings', () => {
            const text = '== Заголовок *жирный* ==';
            const errors = validateWikiContent(text).filter(e => e.ruleId === 'heading-no-formatting');

            expect(errors).toHaveLength(1);
            expect(errors[0].message).toBe('Жирный текст запрещён в заголовках');
            expect(text.slice(errors[0].from, errors[0].to)).toBe('*жирный*');
        });

        it('should detect italic in headings', () => {
            const text = '== Заголовок _курсив_ ==';
            const errors = validateWikiContent(text).filter(e => e.ruleId === 'heading-no-formatting');

            expect(errors).toHaveLength(1);
            expect(errors[0].message).toBe('Курсив запрещён в заголовках');
            expect(text.slice(errors[0].from, errors[0].to)).toBe('_курсив_');
        });

        it('should detect both bold and italic in one heading', () => {
            const text = '== *жирный* и _курсив_ ==';
            const errors = validateWikiContent(text).filter(e => e.ruleId === 'heading-no-formatting');

            expect(errors).toHaveLength(2);
        });

        it('should not flag formatting outside headings', () => {
            const text = 'Текст *жирный* и _курсив_ тут.';
            const errors = validateWikiContent(text);

            expect(errors).toHaveLength(0);
        });
    });

    describe('heading-no-footnotes', () => {
        it('should detect footnotes in headings', () => {
            const text = '== Заголовок [[сноска]] ==';
            const errors = validateWikiContent(text).filter(e => e.ruleId === 'heading-no-footnotes');

            expect(errors).toHaveLength(1);
            expect(errors[0].message).toBe('Сноски запрещены в заголовках');
            expect(text.slice(errors[0].from, errors[0].to)).toBe('[[сноска]]');
        });

        it('should not flag footnotes outside headings', () => {
            const text = 'Текст со [[сноской]] тут.';
            const errors = validateWikiContent(text);

            expect(errors).toHaveLength(0);
        });
    });

    describe('multiple rules', () => {
        it('should report errors from all rules in one heading', () => {
            const text = '== ((ссылка)) *жирный* [[сноска]] ==';
            const errors = validateWikiContent(text);

            const ruleIds = errors.map(e => e.ruleId);
            expect(ruleIds).toContain('heading-no-links');
            expect(ruleIds).toContain('heading-no-formatting');
            expect(ruleIds).toContain('heading-no-footnotes');
        });

        it('should handle multiline text with multiple headings', () => {
            const text = [
                'Обычный текст',
                '== Нормальный заголовок ==',
                'Ещё текст',
                '=== Заголовок с ((ссылкой)) ===',
                '== Заголовок с *жирным* ==',
            ].join('\n');
            const errors = validateWikiContent(text);

            expect(errors).toHaveLength(2);
        });

        it('should return empty array for valid content', () => {
            const text = [
                '== Чистый заголовок ==',
                'Текст с ((ссылкой)) *жирным* [[сноской]]',
                '=== Ещё чистый ===',
            ].join('\n');
            const errors = validateWikiContent(text);

            expect(errors).toHaveLength(0);
        });
    });
});
