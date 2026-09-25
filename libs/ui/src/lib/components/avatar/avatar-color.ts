/** How many tones `_theme-colors.scss` defines as `avatar-bg-N` / `avatar-name-N`. */
const AVATAR_TONES = 7;
const HASH_MULTIPLIER = 31;

/**
 * The tone a person is drawn in, derived from the full name: the name is what
 * every place showing an author has, so one person gets one colour site-wide.
 */
function avatarTone(name: string): number {
    let hash = 0;
    for (const char of name) {
        hash = (Math.imul(hash, HASH_MULTIPLIER) + (char.codePointAt(0) ?? 0)) | 0;
    }

    return (Math.abs(hash) % AVATAR_TONES) + 1;
}

export function avatarBackground(name: string): string {
    return `var(--themed-avatar-bg-${avatarTone(name)})`;
}

/** The text colour for a name shown beside, or instead of, its avatar. */
export function avatarNameColor(name: string): string {
    return `var(--themed-avatar-name-${avatarTone(name)})`;
}
