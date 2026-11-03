import {
    WIKI_BOLD_REGEX,
    WIKI_FOOTNOTE_REGEX,
    WIKI_HEADING_REGEX,
    WIKI_ITALIC_REGEX,
    WIKI_LINK_REGEX,
    WIKI_PICTURE_REGEX,
    WIKI_TAG_REGEX,
    WIKI_URL_REGEX,
} from './constants/wiki-patterns';
import { MASK_FILLER, maskLiteralAndComments } from './mask';

const FILLER_RUN = new RegExp(`${MASK_FILLER}+`, 'gu');
// List `*`/`#`, quote `>` and indent `:` markers open a line; a `*` glued to a word opens bold instead.
const LINE_MARKER = /^(?:[*#]+\s+|>[>\s]*|:+\s*)/u;
const LETTER = /\p{L}/u;
// Private-use characters carry no meaning in an article, so a slot cannot be mistaken for text or markup.
const URL_SLOT = /\uE000(\d+)\uE001/gu;

/**
 * The prose a reader sees on each source line: index `i` is line `i + 1`, and a line
 * with no letters left is an empty string.
 */
export function toProseLines(text: string): readonly string[] {
    // Comments, `<nowiki>` and footnotes can span lines, so they go before the split; both keep the line breaks.
    // URLs stay: blanking one leaves the punctuation around it dangling, which reads as an error.
    const prose = maskLiteralAndComments(text).replace(WIKI_FOOTNOTE_REGEX, (_, note: string) => ` (${note})`);
    return prose.split('\n').map(toProseLine);
}

function toProseLine(line: string): string {
    // The formatter links URLs before the inline rules, so an underscore in one never reads as italic.
    const urls: string[] = [];
    // The fillers turn to spaces first, so a URL ends where a comment glued to it starts.
    const prose = line
        .replace(FILLER_RUN, ' ')
        .replace(WIKI_URL_REGEX, url => `\uE000${urls.push(url) - 1}\uE001`)
        .replace(LINE_MARKER, '')
        .replace(WIKI_HEADING_REGEX, (_, h3: string | undefined, h2: string | undefined) => h3 ?? h2 ?? '')
        .replace(WIKI_LINK_REGEX, (_, link: string) => linkLabel(link))
        .replace(WIKI_BOLD_REGEX, '$1')
        .replace(WIKI_ITALIC_REGEX, '$1')
        .replace(WIKI_PICTURE_REGEX, '')
        .replace(WIKI_TAG_REGEX, '')
        .replace(/\s+/gu, ' ')
        .replace(URL_SLOT, (_, index: string) => urls[Number(index)] ?? '')
        .trim();
    return LETTER.test(prose) ? prose : '';
}

// Synced with: InternalLinkRule::splitLink — `target=label`, the target standing in for a missing label.
function linkLabel(link: string): string {
    const separator = link.indexOf('=');
    if (separator === -1) return link.trim();
    return link.slice(separator + 1).trim() || link.slice(0, separator).trim();
}
