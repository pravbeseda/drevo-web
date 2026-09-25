import { scrollableAncestor } from './scrollable-ancestor';

function box(overflowY: string, scrollHeight: number, clientHeight: number): HTMLElement {
    const element = document.createElement('div');
    element.style.overflowY = overflowY;
    Object.defineProperty(element, 'scrollHeight', { value: scrollHeight });
    Object.defineProperty(element, 'clientHeight', { value: clientHeight });
    return element;
}

describe('scrollableAncestor', () => {
    afterEach(() => (document.body.innerHTML = ''));

    it('finds the nearest ancestor that scrolls its overflowing content', () => {
        const outer = box('auto', 2000, 500);
        const inner = box('scroll', 1500, 400);
        const target = document.createElement('span');
        inner.append(target);
        outer.append(inner);
        document.body.append(outer);

        expect(scrollableAncestor(target)).toBe(inner);
    });

    it('passes over an ancestor whose content fits, and one that clips rather than scrolls', () => {
        const scroller = box('auto', 2000, 500);
        const fitting = box('auto', 300, 300);
        const clipping = box('hidden', 1000, 200);
        const target = document.createElement('span');
        clipping.append(target);
        fitting.append(clipping);
        scroller.append(fitting);
        document.body.append(scroller);

        expect(scrollableAncestor(target)).toBe(scroller);
    });

    it('falls back to the document scroller', () => {
        const target = document.createElement('span');
        document.body.append(target);

        expect(scrollableAncestor(target)).toBe(document.documentElement);
    });
});
