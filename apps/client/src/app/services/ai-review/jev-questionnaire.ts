import { AiThresholds, ProseLine } from './ai-review.model';
import { JevChoiceAnswer, JevChoiceQuestion } from './jev.model';
import { CHECK_LEVELS, CheckCategory, CheckFinding } from '@drevo-web/editor';

/** Bumped whenever a question changes, so cached answers to the old wording are not reused. */
export const JEV_QUESTIONNAIRE_VERSION = 1;

export const DEFAULT_AI_THRESHOLDS: AiThresholds = { finding: 0.7, hint: 0.4 };

const NONE = 'none';

interface QuestionnaireEntry {
    readonly category: CheckCategory;
    readonly question: JevChoiceQuestion;
}

const QUESTIONNAIRE: Readonly<Record<string, QuestionnaireEntry>> = {
    spelling: {
        category: 'spelling',
        question: {
            type: 'choice',
            instructions: 'Есть ли в абзаце орфографические ошибки или опечатки?',
            criteria: {
                [NONE]: 'Ошибок нет',
                typo: 'Опечатка — пропущена, лишняя или переставлена буква',
                spelling: 'Слово написано с орфографической ошибкой',
            },
        },
    },
    grammar: {
        category: 'grammar',
        question: {
            type: 'choice',
            instructions: 'Есть ли в абзаце грамматические ошибки?',
            criteria: {
                [NONE]: 'Ошибок нет',
                agreement: 'Нарушено согласование — род, число или падеж',
                government: 'Неверное управление или предлог',
                punctuation: 'Пунктуационная ошибка',
            },
        },
    },
    style: {
        category: 'style',
        question: {
            type: 'choice',
            instructions: 'Подходит ли стиль абзаца для энциклопедии?',
            criteria: {
                [NONE]: 'Стиль нейтральный, энциклопедический',
                colloquial: 'Разговорные обороты',
                bureaucratic: 'Канцелярит',
                evaluative: 'Оценочные или эмоциональные слова',
            },
        },
    },
};

export const JEV_QUESTIONS: Readonly<Record<string, JevChoiceQuestion>> = Object.fromEntries(
    Object.entries(QUESTIONNAIRE).map(([key, entry]) => [key, entry.question]),
);

/** The findings Jev's answers about one line amount to: one per question whose problem is likely enough. */
export function toFindings(
    answers: Readonly<Partial<Record<string, JevChoiceAnswer>>>,
    line: ProseLine,
    thresholds: AiThresholds,
): readonly CheckFinding[] {
    return Object.entries(QUESTIONNAIRE).flatMap(([key, { category, question }]): CheckFinding[] => {
        const probabilities = answers[key]?.probabilities;
        if (!probabilities) return [];

        const probability = 1 - (probabilities[NONE] ?? 0);
        const winner = mostProbableProblem(probabilities);
        const description = winner === undefined ? undefined : question.criteria[winner];
        if (probability < thresholds.hint || description === undefined) return [];

        const isLikely = probability >= thresholds.finding;
        return [
            {
                from: line.from,
                to: line.to,
                ruleId: `ai-${key}`,
                category,
                level: isLikely ? CHECK_LEVELS[category] : 'hint',
                message: isLikely
                    ? description
                    : `Возможно: ${description.charAt(0).toLowerCase()}${description.slice(1)}`,
                probability,
            },
        ];
    });
}

function mostProbableProblem(probabilities: Readonly<Record<string, number>>): string | undefined {
    return Object.entries(probabilities)
        .filter(([option]) => option !== NONE)
        .sort(([, a], [, b]) => b - a)[0]?.[0];
}
