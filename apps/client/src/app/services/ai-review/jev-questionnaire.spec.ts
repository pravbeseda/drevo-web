import { JevChoiceAnswer } from './jev.model';
import { JEV_QUESTIONS, toFindings } from './jev-questionnaire';
import { ProseLine } from './ai-review.model';

const LINE: ProseLine = { line: 3, from: 40, to: 80, text: 'Абзац с ошибкой.' };

function answer(probabilities: Readonly<Record<string, number>>): JevChoiceAnswer {
    const [choice] = Object.entries(probabilities).sort(([, a], [, b]) => b - a)[0];
    return { type: 'choice', choice, confidence: 0.5, probabilities };
}

describe('JEV_QUESTIONS', () => {
    it('should ask one choice question per category, each with a none option', () => {
        expect(Object.keys(JEV_QUESTIONS)).toEqual(['spelling', 'grammar', 'style']);
        for (const question of Object.values(JEV_QUESTIONS)) {
            expect(question.type).toBe('choice');
            expect(question.criteria['none']).toBeDefined();
        }
    });
});

describe('toFindings', () => {
    it('should report nothing when every question answers none', () => {
        expect(
            toFindings(
                {
                    spelling: answer({ none: 0.9, typo: 0.05, spelling: 0.05 }),
                    grammar: answer({ none: 0.95, agreement: 0.05, government: 0, punctuation: 0 }),
                    style: answer({ none: 0.8, colloquial: 0.1, bureaucratic: 0.1, evaluative: 0 }),
                },
                LINE,
            ),
        ).toEqual([]);
    });

    it('should report a likely problem at its category level, with the winning option as the message', () => {
        const findings = toFindings({ spelling: answer({ none: 0.2, typo: 0.7, spelling: 0.1 }) }, LINE);

        expect(findings).toEqual([
            {
                from: 40,
                to: 80,
                ruleId: 'ai-spelling',
                category: 'spelling',
                level: 'serious',
                message: 'Опечатка — пропущена, лишняя или переставлена буква',
                probability: 0.8,
            },
        ]);
    });

    it('should report a style problem as a fix', () => {
        const [finding] = toFindings(
            { style: answer({ none: 0.1, colloquial: 0.2, bureaucratic: 0.6, evaluative: 0.1 }) },
            LINE,
        );

        expect(finding).toMatchObject({ category: 'style', level: 'fix', message: 'Канцелярит' });
    });

    it('should report an uncertain problem as a hint', () => {
        const [finding] = toFindings(
            { grammar: answer({ none: 0.5, agreement: 0.1, government: 0.1, punctuation: 0.3 }) },
            LINE,
        );

        expect(finding).toMatchObject({
            category: 'grammar',
            level: 'hint',
            message: 'Возможно: пунктуационная ошибка',
            probability: 0.5,
        });
    });

    it('should treat the thresholds as inclusive', () => {
        expect(toFindings({ spelling: answer({ none: 0.3, typo: 0.7, spelling: 0 }) }, LINE)[0].level).toBe('serious');
        expect(toFindings({ spelling: answer({ none: 0.6, typo: 0.4, spelling: 0 }) }, LINE)[0].level).toBe('hint');
        expect(toFindings({ spelling: answer({ none: 0.61, typo: 0.39, spelling: 0 }) }, LINE)).toEqual([]);
    });

    it('should skip a question the answer leaves out or answers with an unknown option', () => {
        expect(toFindings({ spelling: answer({ none: 0.1, unknown: 0.9 }) }, LINE)).toEqual([]);
        expect(toFindings({}, LINE)).toEqual([]);
    });
});
