/**
 * True when a mouse click carries a modifier or is not the primary button —
 * i.e. the user asked the browser to do something special (open in a new tab,
 * new window, download). Click handlers must not `preventDefault` these, so the
 * native `href` behaviour is preserved.
 */
export function isModifiedClick(event: MouseEvent): boolean {
    return event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
}
