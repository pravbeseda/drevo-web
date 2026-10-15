/** A row of the topic list shows one line; the rest of a long draft is never on screen. */
const EXCERPT_MAX_LENGTH = 200;

const QUOTE_ONLY_EXCERPT = 'цитата';

/** The reader's own words in a reply draft as one line, the quoted lines left out. */
export function draftExcerpt(text: string): string {
    const ownText = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('>'))
        .join(' ');
    return ownText.length > 0 ? ownText.slice(0, EXCERPT_MAX_LENGTH) : QUOTE_ONLY_EXCERPT;
}
