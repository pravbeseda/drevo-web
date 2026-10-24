import { RuleMatch } from '../models/validation-rule.model';

export function findAll(text: string, pattern: RegExp, message: string, suggestion?: string): readonly RuleMatch[] {
    return Array.from(text.matchAll(pattern), match => ({
        from: match.index,
        to: match.index + match[0].length,
        message,
        suggestion,
    }));
}
