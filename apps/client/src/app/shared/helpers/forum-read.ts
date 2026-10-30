/** Sub-pixel rounding of a box on screen. */
const LAYOUT_TOLERANCE_PX = 1;

type ScreenBox = Pick<DOMRect, 'top' | 'bottom' | 'height'>;

/**
 * Whether a message card on screen counts as read: wholly inside the feed, or
 * — for a card taller than the feed, which can never be — with its end inside.
 */
export function isMessageRead(card: ScreenBox, feed: ScreenBox): boolean {
    const endInFeed = card.bottom <= feed.bottom + LAYOUT_TOLERANCE_PX && card.bottom > feed.top;
    const startInFeed = card.top >= feed.top - LAYOUT_TOLERANCE_PX;

    return endInFeed && (startInFeed || card.height > feed.height);
}
