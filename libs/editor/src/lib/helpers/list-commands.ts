import { EditorView } from '@codemirror/view';

export function continueLists(view: EditorView): boolean {
    const { state } = view;
    const { doc } = state;
    const { head } = state.selection.main;

    // Get the current line
    const line = doc.lineAt(head);
    const lineContent = line.text;

    // Check if the line starts with a quote character ">"
    const quoteMatch = lineContent.match(/^>\s*/);

    if (quoteMatch) {
        // Special handling for quote character ">"
        const prefix = quoteMatch[0];
        const remainingContent = lineContent.substring(head - line.from);
        const isCursorAtEndOfLine = head === line.to;

        let insertText;
        const cursorPos = head + 2; // Position after first \n\n

        if (isCursorAtEndOfLine) {
            // If cursor is at the end of line, just insert two lines
            // One empty line and one for cursor
            insertText = '\n\n';
        } else {
            // Format: Empty line + cursor line + empty lines + (optional) remaining text with prefix
            insertText = '\n\n\n\n'; // Four lines: before cursor, cursor line, two empty lines after

            // Add remaining text with prefix
            if (remainingContent.trim().length > 0) {
                insertText += prefix + remainingContent;
            }
        }

        view.dispatch({
            changes: {
                from: head,
                to: line.to,
                insert: insertText,
            },
            selection: { anchor: cursorPos }, // Place cursor on the second line
        });
        return true;
    }

    // Handling for lists (* and #), with skip for single '*' used in bold (even total '*' count)
    const listPrefixMatch = lineContent.match(/^([*#]+)(\s*)/);

    if (listPrefixMatch) {
        const symbolPrefix = listPrefixMatch[1]; // sequence of '*' or '#'
        // If single '*' and total '*' count is even, skip (likely bold syntax)
        if (symbolPrefix === '*') {
            const totalStars = (lineContent.match(/\*/g) || []).length;
            if (totalStars % 2 === 0) {
                return false;
            }
        }

        // Form the correct prefix with a guaranteed space
        const correctPrefix = symbolPrefix + ' ';

        // If the line contains only prefix and whitespace, remove the prefix
        if (lineContent.trim() === symbolPrefix.trim()) {
            // Remove prefix and insert an empty line before cursor
            view.dispatch({
                changes: {
                    from: line.from,
                    to: line.to,
                    insert: '\n',
                },
                selection: { anchor: line.from + 1 }, // Position cursor after the empty line
            });
            return true;
        }

        // Insert a new line with the full prefix (guarantee a space)
        view.dispatch({
            changes: {
                from: head,
                to: head,
                insert: '\n' + correctPrefix,
            },
            selection: { anchor: head + 1 + correctPrefix.length },
        });
        return true;
    }

    return false;
}

export function increaseListIndent(view: EditorView): boolean {
    const { state } = view;
    const { doc } = state;
    const selection = state.selection;

    // Проверяем, есть ли выделение
    if (selection.ranges.length > 0) {
        // Получаем диапазон строк, затронутых выделением
        const startLine = doc.lineAt(selection.main.from);
        const endLine = doc.lineAt(selection.main.to);

        // Если выделение охватывает несколько строк
        if (startLine.number !== endLine.number) {
            const changes = [];
            let affectedLines = false;

            // Проходим по всем строкам в выделении
            for (let i = startLine.number; i <= endLine.number; i++) {
                const line = doc.line(i);
                const lineContent = line.text;

                // Проверяем, является ли строка элементом списка
                const listPrefixMatch = lineContent.match(/^([*#]+)(\s*)/);

                if (listPrefixMatch) {
                    affectedLines = true;
                    const currentPrefix = listPrefixMatch[1];
                    // Используем последний символ префикса вместо первого
                    const lastChar = currentPrefix[currentPrefix.length - 1];
                    const newPrefix = currentPrefix + lastChar;
                    const spaceAfter = listPrefixMatch[2];

                    changes.push({
                        from: line.from,
                        to: line.from + listPrefixMatch[0].length,
                        insert: newPrefix + spaceAfter,
                    });
                }
            }

            if (affectedLines) {
                view.dispatch({ changes });
                return true;
            }
        }
    }

    // Обработка одной строки (как раньше)
    const { head } = selection.main;

    // Получаем текущую строку
    const line = doc.lineAt(head);
    const lineContent = line.text;

    // Проверяем, начинается ли строка с маркера списка (* или #)
    const listPrefixMatch = lineContent.match(/^([*#]+)(\s*)/);

    if (listPrefixMatch) {
        // Увеличиваем уровень вложенности, добавляя один символ в начало
        // Используем последний символ из текущего префикса
        const currentPrefix = listPrefixMatch[1]; // Текущие символы * и #
        const lastChar = currentPrefix[currentPrefix.length - 1]; // Последний символ
        const newPrefix = currentPrefix + lastChar; // Добавляем один символ того же типа
        const spaceAfter = listPrefixMatch[2]; // Сохраняем пробелы после префикса

        // Заменяем старый префикс на новый
        view.dispatch({
            changes: {
                from: line.from,
                to: line.from + listPrefixMatch[0].length,
                insert: newPrefix + spaceAfter,
            },
        });

        return true;
    }

    return false;
}

export function decreaseListIndent(view: EditorView): boolean {
    const { state } = view;
    const { doc } = state;
    const selection = state.selection;

    // Проверяем, есть ли выделение
    if (selection.ranges.length > 0) {
        // Получаем диапазон строк, затронутых выделением
        const startLine = doc.lineAt(selection.main.from);
        const endLine = doc.lineAt(selection.main.to);

        // Если выделение охватывает несколько строк
        if (startLine.number !== endLine.number) {
            const changes = [];
            let affectedLines = false;

            // Проходим по всем строкам в выделении
            for (let i = startLine.number; i <= endLine.number; i++) {
                const line = doc.line(i);
                const lineContent = line.text;

                // Проверяем, является ли строка элементом списка с вложенностью > 1
                const listPrefixMatch = lineContent.match(/^([*#]+)(\s*)/);

                if (listPrefixMatch && listPrefixMatch[1].length > 1) {
                    affectedLines = true;
                    const currentPrefix = listPrefixMatch[1];
                    const newPrefix = currentPrefix.slice(0, -1); // Удаляем последний символ
                    const spaceAfter = listPrefixMatch[2];

                    changes.push({
                        from: line.from,
                        to: line.from + listPrefixMatch[0].length,
                        insert: newPrefix + spaceAfter,
                    });
                }
            }

            if (affectedLines) {
                view.dispatch({ changes });
                return true;
            }
        }
    }

    // Обработка одной строки (как раньше)
    const { head } = selection.main;

    // Получаем текущую строку
    const line = doc.lineAt(head);
    const lineContent = line.text;

    // Проверяем, начинается ли строка с маркера списка (* или #)
    const listPrefixMatch = lineContent.match(/^([*#]+)(\s*)/);

    if (listPrefixMatch && listPrefixMatch[1].length > 1) {
        // Уменьшаем уровень вложенности, удаляя один символ из начала
        const currentPrefix = listPrefixMatch[1];
        const newPrefix = currentPrefix.slice(0, -1); // Удаляем последний символ
        const spaceAfter = listPrefixMatch[2]; // Сохраняем пробелы после префикса

        // Заменяем старый префикс на новый
        view.dispatch({
            changes: {
                from: line.from,
                to: line.from + listPrefixMatch[0].length,
                insert: newPrefix + spaceAfter,
            },
        });

        return true;
    }

    return false;
}
