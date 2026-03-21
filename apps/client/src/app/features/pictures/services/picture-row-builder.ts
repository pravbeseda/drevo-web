import { Picture } from '@drevo-web/shared';

const DEFAULT_ASPECT_RATIO = 3 / 4;
// Keep in sync with $picture-gap in picture-row.component.scss
const GAP = 8;
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
 * 3. When row is full, compute row height so uncapped items fill remaining space exactly
 * 4. Capped items keep their max height and get vertical padding via align-items:center
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
 * Compute row height so the row fills containerWidth exactly.
 * Capped items (thumbnail-limited) contribute fixed width; uncapped items stretch to fill the rest.
 * Iterates because raising height for uncapped items may cause new items to hit their cap.
 */
function finalizeRow(
    items: readonly RowEntry[],
    containerWidth: number,
    fixedHeight?: number,
): PictureRow {
    const totalGap = (items.length - 1) * GAP;
    const availableWidth = containerWidth - totalGap;

    if (fixedHeight !== undefined) {
        // Last row — fixed height, cap individual items
        return buildRowResult(items, fixedHeight);
    }

    // Full row — iteratively solve for row height with thumbnail caps
    const capped = new Array<boolean>(items.length).fill(false);
    let cappedWidthSum = 0;
    let uncappedAspectSum = items.reduce((sum, item) => sum + item.aspectRatio, 0);

    for (let iter = 0; iter < items.length; iter++) {
        const rowHeight = uncappedAspectSum > 0 ? (availableWidth - cappedWidthSum) / uncappedAspectSum : 0;
        let changed = false;

        for (let i = 0; i < items.length; i++) {
            if (!capped[i] && rowHeight > items[i].maxDisplayHeight) {
                capped[i] = true;
                const fixedWidth = items[i].aspectRatio * items[i].maxDisplayHeight;
                cappedWidthSum += fixedWidth;
                uncappedAspectSum -= items[i].aspectRatio;
                changed = true;
            }
        }

        if (!changed) break;
    }

    const rowHeight =
        uncappedAspectSum > 0
            ? (availableWidth - cappedWidthSum) / uncappedAspectSum
            : Math.min(...items.map(item => item.maxDisplayHeight));

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
