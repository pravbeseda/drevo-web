import { ContentError } from './models/content-error.model';
import { ALL_RULES } from './rules';

export function validateWikiContent(text: string): readonly ContentError[] {
    return ALL_RULES.flatMap(rule =>
        rule.validate(text).map(match => ({
            ...match,
            severity: rule.defaultSeverity,
            ruleId: rule.id,
        })),
    );
}
