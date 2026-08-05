// Wiki markup regex patterns used on the frontend.
// MUST be kept in sync with: legacy-drevo-yii/protected/components/WikiFormatter/Rules/
//
// When modifying patterns here, verify they match the legacy PHP counterparts.
// When legacy patterns change, update this file accordingly.
//
// Patterns mirror the PHP originals, so the sonarjs regex rules are suppressed per pattern —
// rewriting one for lint would silently desync the two engines. Suppressions are deliberately
// line-scoped rather than file-wide, so a pattern added later still gets checked.
//
// Constant or factory: every pattern carries the `g` flag, which makes `lastIndex` mutable state.
// A pattern stays a shared constant while it is module-internal and every consumer reaches it
// through `matchAll`, which does not touch the source object. A pattern exported from
// `libs/editor/src/index.ts` becomes a factory instead — outside the package there is no way to
// know a caller will not reach for `exec`/`test` on the shared instance.

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

// Synced with: WikiFormatter::PICTURE_MARKER_PATTERN — /@(-?\d+)@/
// `@-N@` renders picture N without a caption, so the sign is a layout variant and the id is the absolute value.
// A factory rather than a constant because this one is exported from the package — see the header.
export function createPictureMarkerRegex(): RegExp {
    return /@(-?\d+)@/g;
}
