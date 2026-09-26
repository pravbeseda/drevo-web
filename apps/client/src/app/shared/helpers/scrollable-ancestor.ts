const SCROLLING_OVERFLOW = new Set(['auto', 'scroll']);

/**
 * The element that actually scrolls the given one: the nearest ancestor whose
 * content overflows a scrolling box, or the document itself.
 */
export function scrollableAncestor(element: Element): Element {
    const document = element.ownerDocument;
    const view = document.defaultView;

    for (let ancestor = element.parentElement; ancestor && view; ancestor = ancestor.parentElement) {
        const overflows = ancestor.scrollHeight > ancestor.clientHeight;
        if (overflows && SCROLLING_OVERFLOW.has(view.getComputedStyle(ancestor).overflowY)) {
            return ancestor;
        }
    }

    return document.scrollingElement ?? document.documentElement;
}
