import { RuleMatch, ValidationRule } from '../models/validation-rule.model';

function findUnpairedInLine(
    line: string,
    lineStart: number,
    openChar: string,
    closeChar: string,
    openMessage: string,
    closeMessage: string,
): readonly RuleMatch[] {
    const matches: RuleMatch[] = [];
    const stack: number[] = [];

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === openChar) {
            stack.push(i);
        } else if (ch === closeChar) {
            if (stack.length > 0) {
                stack.pop();
            } else {
                matches.push({
                    from: lineStart + i,
                    to: lineStart + i + 1,
                    message: closeMessage,
                });
            }
        }
    }

    for (const pos of stack) {
        matches.push({
            from: lineStart + pos,
            to: lineStart + pos + 1,
            message: openMessage,
        });
    }

    return matches;
}

export const pairedBrackets: ValidationRule = {
    id: 'paired-brackets',
    defaultSeverity: 'warning',
    validate(text: string): readonly RuleMatch[] {
        const matches: RuleMatch[] = [];
        const lines = text.split('\n');
        let offset = 0;

        for (const line of lines) {
            matches.push(
                ...findUnpairedInLine(
                    line,
                    offset,
                    '(',
                    ')',
                    'Нет закрывающей скобки )',
                    'Нет открывающей скобки (',
                ),
                ...findUnpairedInLine(
                    line,
                    offset,
                    '{',
                    '}',
                    'Нет закрывающей скобки }',
                    'Нет открывающей скобки {',
                ),
            );
            offset += line.length + 1;
        }

        const squareStack: number[] = [];
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '[') {
                squareStack.push(i);
            } else if (ch === ']') {
                if (squareStack.length > 0) {
                    squareStack.pop();
                } else {
                    matches.push({
                        from: i,
                        to: i + 1,
                        message: 'Нет открывающей скобки [',
                    });
                }
            }
        }

        for (const pos of squareStack) {
            matches.push({
                from: pos,
                to: pos + 1,
                message: 'Нет закрывающей скобки ]',
            });
        }

        return matches;
    },
};
