// Wiki markup regex patterns used on the frontend.
// MUST be kept in sync with: legacy-drevo-yii/protected/components/WikiFormatter/Rules/
//
// When modifying patterns here, verify they match the legacy PHP counterparts.
// When legacy patterns change, update this file accordingly.
//
// Patterns mirror the PHP originals, so the sonarjs regex rules are suppressed per pattern —
// rewriting one for lint would silently desync the two engines. Suppressions are deliberately
// line-scoped rather than file-wide, so a pattern added later still gets checked.

// Synced with: HeaderRule.php — /===(.+?)===|==(.+?)==/u
// Group 1: h3 content (if matched), Group 2: h2 content (if matched)
export const WIKI_HEADING_REGEX = /===(.+?)===|==(.+?)==/gu;

// Synced with: WikiFormatter::INTERNAL_LINK_PATTERN — /\(\((?!\()(.+?)\)\)(?!\))/u
export const WIKI_LINK_REGEX = /\(\((?!\()(.+?)\)\)(?!\))/gu;

// Synced with: InlineRules.php — /\*([^\s*\r\n](?:[^*\r\n]*[^\s*\r\n])?)\*/u (bold)
// eslint-disable-next-line sonarjs/duplicates-in-character-class -- `\s` and `\r\n` overlap in the PHP original; narrowing the class here would desync it
export const WIKI_BOLD_REGEX = /\*([^\s*\r\n](?:[^*\r\n]*[^\s*\r\n])?)\*/gu;

// Synced with: InlineRules.php — /_([^\s_\r\n](?:[^_\r\n]*[^\s_\r\n])?)_/u (italic)
// eslint-disable-next-line sonarjs/duplicates-in-character-class -- same overlap as the bold pattern above, kept verbatim from PHP
export const WIKI_ITALIC_REGEX = /_([^\s_\r\n](?:[^_\r\n]*[^\s_\r\n])?)_/gu;

// Synced with: FootnoteRule.php — /\[\[(.+?)\]\]/smu
// eslint-disable-next-line sonarjs/super-linear-regex -- `[\s\S]` is the PHP `s` flag; quadratic only inside a single heading, which `findInHeadings` bounds to one line
export const WIKI_FOOTNOTE_REGEX = /\[\[([\s\S]+?)\]\]/gu;
