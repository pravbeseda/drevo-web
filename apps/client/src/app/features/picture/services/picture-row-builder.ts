import { Picture } from '@drevo-web/shared';

const DEFAULT_ASPECT_RATIO = 3 / 4;
// Keep in sync with $picture-gap in picture-row.component.scss
const GAP = 8;
const MIN_ROW_HEIGHT = 200;
// Keep in sync with legacy ImageHelper.php resize(400, 400)
const THUMB_MAX_WIDTH = 400;
const THUMB_MAX_HEIGHT = 400;

export interface PictureRowItem {
    readonly picture: Picture;
    readonly width: number;
    readonly height: number;
}

export interface PictureRow {
    readonly items: readonly PictureRowItem[];
    readonly height: number;
}

interface RowEntry {
    readonly picture: Picture;
    readonly aspectRatio: number;
    readonly maxDisplayHeight: number;
}

/**
 * Build justified rows of pictures (like Google Photos).
 *
 * Algorithm:
 * 1. For each picture, compute aspect ratio and max display height (thumbnail constraint)
 * 2. Add pictures to current row using effective width (capped by thumbnail size)
 * 3. When row is full, compute row height via sorted single-pass capping
 * 4. If all items are capped, use MIN_ROW_HEIGHT fallback; space is distributed via dynamic gap
 * 5. Last row uses target height (not stretched to fill)
 */
export function buildRows(
    pictures: readonly Picture[],
    containerWidth: number,
    targetRowHeight: number,
): readonly PictureRow[] {
    if (pictures.length === 0 || containerWidth <= 0) {
        return [];
    }

    // Reserve right margin so pictures don't touch the scrollbar
    containerWidth -= GAP;

    const rows: PictureRow[] = [];
    let currentItems: RowEntry[] = [];
    let currentRowWidth = 0;

    for (const picture of pictures) {
        const aspectRatio =
            picture.width !== undefined && picture.height !== undefined && picture.height > 0
                ? picture.width / picture.height
                : DEFAULT_ASPECT_RATIO;

        const maxDisplayHeight = getMaxDisplayHeight(picture);
        const effectiveHeight = Math.min(targetRowHeight, maxDisplayHeight);
        const scaledWidth = aspectRatio * effectiveHeight;
        const gapSpace = currentItems.length * GAP;

        if (currentItems.length > 0 && currentRowWidth + gapSpace + scaledWidth > containerWidth) {
            rows.push(finalizeRow(currentItems, containerWidth));
            currentItems = [];
            currentRowWidth = 0;
        }

        currentItems.push({ picture, aspectRatio, maxDisplayHeight });
        currentRowWidth += scaledWidth;
    }

    // Last row — use target height (don't stretch)
    if (currentItems.length > 0) {
        rows.push(finalizeRow(currentItems, containerWidth, targetRowHeight));
    }

    return rows;
}

/**
 * Max display height for a picture without exceeding its thumbnail resolution.
 * Thumbnails are generated at max THUMB_MAX_WIDTH × THUMB_MAX_HEIGHT (legacy ImageHelper).
 * Returns Infinity if dimensions are unknown (no limit).
 */
function getMaxDisplayHeight(picture: Picture): number {
    if (picture.width === undefined || picture.height === undefined || picture.height === 0) {
        return Infinity;
    }
    const scale = Math.min(THUMB_MAX_WIDTH / picture.width, THUMB_MAX_HEIGHT / picture.height, 1);
    return picture.height * scale;
}

/**
 * Compute row height and dynamic gap so the row visually fills containerWidth.
 *
 * Sorted single-pass capping: process items by maxDisplayHeight ascending.
 * Mathematically guaranteed: if rowHeight <= maxH[i], then rowHeight <= maxH[j] for all j > i
 * (sorted ascending and rowHeight can only decrease as items are capped). One pass, no iterations.
 *
 * If all items are capped, rowHeight falls back to max(MIN_ROW_HEIGHT, max(maxDisplayHeights)).
 * Dynamic gap absorbs rounding errors from Math.round() and fills underfilled rows.
 */
function finalizeRow(items: readonly RowEntry[], containerWidth: number, fixedHeight?: number): PictureRow {
    const totalGap = (items.length - 1) * GAP;
    const availableWidth = containerWidth - totalGap;

    if (fixedHeight !== undefined) {
        return buildRowResult(items, fixedHeight);
    }

    const sortedIndices = items
        .map((_, i) => i)
        .sort((a, b) => items[a].maxDisplayHeight - items[b].maxDisplayHeight);

    let cappedWidthSum = 0;
    let uncappedAspectSum = items.reduce((sum, item) => sum + item.aspectRatio, 0);
    let allCapped = true;

    for (const idx of sortedIndices) {
        const item = items[idx];
        const rowHeight = uncappedAspectSum > 0
            ? (availableWidth - cappedWidthSum) / uncappedAspectSum
            : 0;

        if (rowHeight <= item.maxDisplayHeight) {
            allCapped = false;
            break;
        }

        cappedWidthSum += item.aspectRatio * item.maxDisplayHeight;
        uncappedAspectSum -= item.aspectRatio;
    }

    const rowHeight = allCapped
        ? Math.max(MIN_ROW_HEIGHT, Math.max(...items.map(it => it.maxDisplayHeight)))
        : (availableWidth - cappedWidthSum) / uncappedAspectSum;

    return buildRowResult(items, rowHeight);
}

function buildRowResult(items: readonly RowEntry[], rowHeight: number): PictureRow {
    return {
        height: rowHeight,
        items: items.map(item => {
            const itemHeight = Math.min(rowHeight, item.maxDisplayHeight);
            return {
                picture: item.picture,
                width: Math.round(item.aspectRatio * itemHeight),
                height: Math.round(itemHeight),
            };
        }),
    };
}
