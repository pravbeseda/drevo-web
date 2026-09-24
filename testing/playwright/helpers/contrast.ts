const WCAG_LUMINANCE_OFFSET = 0.05;

/** `[r, g, b, alpha]` of an `rgb()`/`rgba()` colour as the browser computes it. */
function parseColor(color: string): readonly [number, number, number, number] {
    const values = color.match(/\d+(\.\d+)?/g)?.map(Number);
    if (!values || values.length < 3) {
        throw new Error(`Not an rgb() colour: ${color}`);
    }
    const [r, g, b, alpha = 1] = values;
    return [r, g, b, alpha];
}

function relativeLuminance(color: string): number {
    const [r, g, b] = parseColor(color)
        .slice(0, 3)
        .map(channel => {
            const value = channel / 255;
            return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio of two opaque `rgb()` colours, as the browser computes them. */
export function contrastRatio(foreground: string, background: string): number {
    const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
    return (lighter + WCAG_LUMINANCE_OFFSET) / (darker + WCAG_LUMINANCE_OFFSET);
}

/** The opaque colour a translucent `rgba()` paints over an opaque background. */
export function composite(color: string, background: string): string {
    const [r, g, b, alpha] = parseColor(color);
    const [br, bg, bb] = parseColor(background);
    const mix = (top: number, bottom: number): number => Math.round(top * alpha + bottom * (1 - alpha));
    return `rgb(${mix(r, br)}, ${mix(g, bg)}, ${mix(b, bb)})`;
}
