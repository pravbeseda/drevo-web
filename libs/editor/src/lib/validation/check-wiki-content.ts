import { CHECK_LEVELS } from './check-levels';
import { CheckFinding } from './models/check-finding.model';
import { ALL_RULES } from './rules/all-rules';

export function checkWikiContent(text: string): readonly CheckFinding[] {
    const reported = new Set<number>();

    return ALL_RULES.flatMap(rule =>
        rule.validate(text).map(match => ({
            ...match,
            ruleId: rule.id,
            category: rule.category,
            level: CHECK_LEVELS[rule.category],
        })),
    ).filter(finding => {
        if (reported.has(finding.from)) return false;
        reported.add(finding.from);
        return true;
    });
}
