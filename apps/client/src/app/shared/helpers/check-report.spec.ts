import { cmDiffConfig } from './cm-diff-config';
import { CheckFinding, checkWikiContent } from '@drevo-web/editor';
import { DiffEngine } from '@drevo-web/shared/diff';
import { buildCheckReport, findChangedLines, locateQuote, selectProseLines, toVerdict } from './check-report';

jest.mock('@drevo-web/editor', () => {
    const actual: typeof import('@drevo-web/editor') = jest.requireActual('@drevo-web/editor');
    return { ...actual, checkWikiContent: jest.fn(actual.checkWikiContent) };
});

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

describe('buildCheckReport with AI findings', () => {
    const text = 'Первая строка.\nВторая строка с опечаткой.';
    const aiFinding = (level: CheckFinding['level']): CheckFinding => ({
        from: 15,
        to: 41,
        ruleId: 'ai-spelling',
        category: 'spelling',
        level,
        message: 'Опечатка',
        probability: 0.8,
    });

    it('merges them into the items, the counts and the verdict', () => {
        const report = buildCheckReport(text, undefined, 'full', [aiFinding('serious')]);

        expect(report.items).toEqual([
            expect.objectContaining({ ruleId: 'ai-spelling', line: 2, fragment: 'Вторая строка с опечаткой.' }),
        ]);
        expect(report.counts).toEqual({ serious: 1, fix: 0, hint: 0 });
        expect(report.verdict).toBe('serious');
    });

    it('lists the rule findings first, the most serious on top, then the AI ones, the most likely on top', () => {
        const ruleFinding = (from: number, level: CheckFinding['level']): CheckFinding => ({
            from,
            to: from + 1,
            ruleId: `rule-${level}`,
            category: 'markup',
            level,
            message: 'Правило',
        });
        jest.mocked(checkWikiContent).mockReturnValueOnce([
            ruleFinding(1, 'hint'),
            ruleFinding(20, 'serious'),
            ruleFinding(2, 'fix'),
            ruleFinding(3, 'serious'),
        ]);
        const ai = (from: number, probability: number): CheckFinding => ({ ...aiFinding('fix'), from, probability });

        const report = buildCheckReport(text, undefined, 'full', [ai(0, 0.5), ai(15, 0.9), ai(15, 0.5)]);

        expect(report.items.map(item => `${item.ruleId}@${item.from}:${item.probability ?? '-'}`)).toEqual([
            'rule-serious@3:-',
            'rule-serious@20:-',
            'rule-fix@2:-',
            'rule-hint@1:-',
            'ai-spelling@15:0.9',
            'ai-spelling@0:0.5',
            'ai-spelling@15:0.5',
        ]);
    });

    it('keeps the light green for an AI hint', () => {
        const report = buildCheckReport(text, undefined, 'full', [aiFinding('hint')]);

        expect(report.counts.hint).toBe(1);
        expect(report.verdict).toBe('clean');
    });
});

describe('findChangedLines', () => {
    const previous = 'Первая.\nВторая.';
    const current = 'Первая!\nВторая.';

    it("counts the lines CodeMirror's diff changed by default", () => {
        expect([...findChangedLines(previous, current)]).toEqual([1]);
    });

    it('counts the lines the given diff config changed', () => {
        const wholeText: DiffEngine = {
            computeDiff: (a, b) => [
                { type: 'delete', text: a },
                { type: 'insert', text: b },
            ],
        };

        expect([...findChangedLines(previous, current, cmDiffConfig(wholeText))]).toEqual([1, 2]);
    });
});

describe('selectProseLines', () => {
    const previous = 'Без изменений.\nСтарая строка.';
    const current = 'Без изменений.\nНовая строка.\n\n@12@';

    it('gives every line with prose, with its place in the source', () => {
        expect(selectProseLines(current, previous, 'full')).toEqual([
            { line: 1, from: 0, to: 14, text: 'Без изменений.' },
            { line: 2, from: 15, to: 28, text: 'Новая строка.' },
        ]);
    });

    it('keeps only the changed lines for the changes scope', () => {
        expect(selectProseLines(current, previous, 'changes').map(line => line.line)).toEqual([2]);
    });

    it('treats every line of a first version as changed', () => {
        expect(selectProseLines(current, undefined, 'changes').map(line => line.line)).toEqual([1, 2]);
    });

    it('masks a comment opened on an unchanged line before picking the changed ones', () => {
        const before = 'Начало [*заметка\nстарое тело\nконец*] после.';
        const after = 'Начало [*заметка\nновое тело\nконец*] после.';

        expect(selectProseLines(after, before, 'changes')).toEqual([]);
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

describe('locateQuote', () => {
    const LINE = 'Первое предложение. В нём есть ашибка и ещё ашибка. Третье.';

    it('finds the first match of the quote, with its sentence around it', () => {
        expect(locateQuote(LINE, 'ашибка')).toEqual({
            from: 31,
            to: 37,
            contextBefore: 'В нём есть ',
            contextAfter: ' и ещё ашибка.',
        });
    });

    it('finds nothing for a quote the line does not hold', () => {
        expect(locateQuote(LINE, 'ошибка')).toBeUndefined();
    });

    it('finds nothing for an empty quote', () => {
        expect(locateQuote(LINE, '  ')).toBeUndefined();
    });
});
