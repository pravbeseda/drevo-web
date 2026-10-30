import { isMessageRead } from './forum-read';

describe('isMessageRead', () => {
    const feed = { top: 100, bottom: 700, height: 600 };
    const box = (top: number, bottom: number): { top: number; bottom: number; height: number } => ({
        top,
        bottom,
        height: bottom - top,
    });

    it('reads a message wholly inside the feed', () => {
        expect(isMessageRead(box(200, 400), feed)).toBe(true);
    });

    it('reads a message that fills the feed edge to edge, sub-pixel rounding included', () => {
        expect(isMessageRead(box(99.5, 700.5), feed)).toBe(true);
    });

    it('does not read a message cut off by the bottom of the feed', () => {
        expect(isMessageRead(box(600, 800), feed)).toBe(false);
    });

    it('does not read a message cut off by the top of the feed', () => {
        expect(isMessageRead(box(50, 300), feed)).toBe(false);
    });

    it('does not read a message outside the feed', () => {
        expect(isMessageRead(box(800, 900), feed)).toBe(false);
        expect(isMessageRead(box(-200, 0), feed)).toBe(false);
    });

    it('reads a message taller than the feed once its end is in it', () => {
        expect(isMessageRead(box(-300, 500), feed)).toBe(true);
    });

    it('does not read a message taller than the feed before its end is in it', () => {
        expect(isMessageRead(box(-300, 800), feed)).toBe(false);
    });
});
