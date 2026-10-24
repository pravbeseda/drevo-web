import { buildCheckReport, toVerdict } from './check-report';

describe('buildCheckReport', () => {
    it('reports nothing for a clean text', () => {
        expect(buildCheckReport('Чистый текст.', undefined, 'full')).toEqual({
            scope: 'full',
            items: [],
            verdict: 'clean',
            counts: { serious: 0, fix: 0, hint: 0 },
        });
    });

    it('lists the findings in reading order with their line and fragment', () => {
        const text = 'Первая строка, ихний дом.\nВторая строка (без пары';
        const report = buildCheckReport(text, undefined, 'full');

        expect(report.items.map(item => [item.ruleId, item.line, item.fragment])).toEqual([
            ['common-misspellings', 1, 'ихний'],
            ['paired-brackets', 2, '('],
        ]);
        expect(report.verdict).toBe('serious');
        expect(report.counts).toEqual({ serious: 2, fix: 0, hint: 0 });
    });

    describe('context', () => {
        it('gives the sentence around the fragment', () => {
            const text = 'Он родился в 1314 г. Затем он ихний дом покинул. Потом ушёл.';
            const [item] = buildCheckReport(text, undefined, 'full').items;

            expect(item.contextBefore).toBe('Затем он ');
            expect(item.contextAfter).toBe(' дом покинул.');
        });

        it('stays inside the line', () => {
            const text = 'Первая строка\nихний дом\nтретья строка';
            const [item] = buildCheckReport(text, undefined, 'full').items;

            expect(item.contextBefore).toBe('');
            expect(item.contextAfter).toBe(' дом');
        });

        it('cuts a long sentence to whole words with an ellipsis', () => {
            const filler = 'один два три четыре пять '.repeat(10);
            const text = `${filler}ихний ${filler}конец.`;
            const [item] = buildCheckReport(text, undefined, 'full').items;

            expect(item.contextBefore).toMatch(/^…(один|два|три|четыре|пять) /u);
            expect(item.contextBefore.length).toBeLessThanOrEqual(101);
            expect(item.contextAfter).toMatch(/ (один|два|три|четыре|пять)…$/u);
            expect(item.contextAfter.length).toBeLessThanOrEqual(101);
        });
    });

    describe('changes scope', () => {
        const previous = 'Старая строка, ихний дом.\nНеизменная строка.';
        const current = 'Старая строка, ихний дом.\nНеизменная строка.\nНовая строка, ихнего сына.';

        it('keeps only the findings on lines this version changed', () => {
            const report = buildCheckReport(current, previous, 'changes');

            expect(report.scope).toBe('changes');
            expect(report.items.map(item => item.fragment)).toEqual(['ихнего']);
            expect(report.items[0].isChanged).toBe(true);
        });

        it('marks unchanged lines in the full scope', () => {
            const report = buildCheckReport(current, previous, 'full');

            expect(report.items.map(item => [item.fragment, item.isChanged])).toEqual([
                ['ихний', false],
                ['ихнего', true],
            ]);
        });

        it('treats a line with any edit as changed, as the paragraph it is', () => {
            const edited = 'Старая строка, ихний дом и сад.\nНеизменная строка.';
            const report = buildCheckReport(edited, previous, 'changes');

            expect(report.items.map(item => item.fragment)).toEqual(['ихний']);
        });

        it('does not count the line before an appended one as changed', () => {
            const report = buildCheckReport('А ихний.\nБ ихнего.', 'А ихний.', 'changes');

            expect(report.items.map(item => item.fragment)).toEqual(['ихнего']);
        });

        it('does not count the neighbours of a removed line as changed', () => {
            const report = buildCheckReport('А ихний.\nВ ихнего.', 'А ихний.\nУдалённая.\nВ ихнего.', 'changes');

            expect(report.items).toEqual([]);
        });

        it('counts a line with a word removed as changed', () => {
            const report = buildCheckReport('А ихний дом.', 'А ихний большой дом.', 'changes');

            expect(report.items.map(item => item.fragment)).toEqual(['ихний']);
        });

        it('treats every line of a first version as changed', () => {
            const report = buildCheckReport(current, undefined, 'changes');

            expect(report.items).toHaveLength(2);
            expect(report.items.every(item => item.isChanged)).toBe(true);
        });
    });
});

describe('toVerdict', () => {
    it.each([
        [{ serious: 1, fix: 3, hint: 2 }, 'serious'],
        [{ serious: 0, fix: 1, hint: 0 }, 'fix'],
        [{ serious: 0, fix: 0, hint: 4 }, 'clean'],
        [{ serious: 0, fix: 0, hint: 0 }, 'clean'],
    ] as const)('turns %o into %s', (counts, verdict) => {
        expect(toVerdict(counts)).toBe(verdict);
    });
});
