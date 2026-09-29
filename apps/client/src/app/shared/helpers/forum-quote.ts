/**
 * The text as the forum quotes it: each line that has text starts with `> `,
 * its leading blanks dropped — `ForumUtil::makeQuote`, except that a blank
 * line stays, where the legacy `\s*` runs across it.
 */
export function quoteForumText(text: string): string {
    return text
        .split('\n')
        .map(line => {
            const content = line.trimStart();
            return content ? `> ${content}` : line;
        })
        .join('\n');
}
