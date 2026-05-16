// Wiki markup regex patterns used on the frontend.
// MUST be kept in sync with: legacy-drevo-yii/protected/components/WikiFormatter/Rules/
//
// When modifying patterns here, verify they match the legacy PHP counterparts.
// When legacy patterns change, update this file accordingly.

// Synced with: HeaderRule.php — /===(.+?)===|==(.+?)==/u
// Group 1: h3 content (if matched), Group 2: h2 content (if matched)
export const WIKI_HEADING_REGEX = /===(.+?)===|==(.+?)==/gu;

// Synced with: WikiFormatter::INTERNAL_LINK_PATTERN — /\(\((?!\()(.+?)\)\)(?!\))/u
export const WIKI_LINK_REGEX = /\(\((?!\()(.+?)\)\)(?!\))/gu;

// Synced with: InlineRules.php — /\*([^\s*\r\n](?:[^*\r\n]*[^\s*\r\n])?)\*/u (bold)
export const WIKI_BOLD_REGEX = /\*([^\s*\r\n](?:[^*\r\n]*[^\s*\r\n])?)\*/gu;

// Synced with: InlineRules.php — /_([^\s_\r\n](?:[^_\r\n]*[^\s_\r\n])?)_/u (italic)
export const WIKI_ITALIC_REGEX = /_([^\s_\r\n](?:[^_\r\n]*[^\s_\r\n])?)_/gu;

// Synced with: FootnoteRule.php — /\[\[(.+?)\]\]/smu
export const WIKI_FOOTNOTE_REGEX = /\[\[([\s\S]+?)\]\]/gu;

// Synced with: WikiFormatter::PICTURE_MARKER_PATTERN — /@(-?\d+)@/
export const WIKI_PICTURE_MARKER_REGEX = /@(-?\d+)@/g;
