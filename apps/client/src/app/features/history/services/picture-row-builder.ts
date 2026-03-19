import { Picture } from '@drevo-web/shared';

const DEFAULT_ASPECT_RATIO = 3 / 4;
// Keep in sync with $picture-gap in picture-row.component.scss
const GAP = 16;

export interface PictureRowItem {
    readonly picture: Picture;
    readonly width: number;
    readonly height: number;
}

export interface PictureRow {
    readonly items: readonly PictureRowItem[];
    readonly height: number;
}

/**
 * Build justified rows of pictures (like Google Photos).
 *
 * Algorithm:
 * 1. For each picture, compute aspect ratio (width/height) or use default 3:4
 * 2. Add pictures to current row until total scaled width exceeds container width
 * 3. When row is full, scale row height so items fit exactly in container width
 * 4. Last row uses target height (not stretched to fill)
 */
export function buildRows(
    pictures: readonly Picture[],
    containerWidth: number,
    targetRowHeight: number,
): readonly PictureRow[] {
    if (pictures.length === 0 || containerWidth <= 0) {
        return [];
    }

    const rows: PictureRow[] = [];
    let currentItems: { picture: Picture; aspectRatio: number }[] = [];
    let currentRowWidth = 0;

    for (const picture of pictures) {
        const aspectRatio =
            picture.width !== undefined && picture.height !== undefined && picture.height > 0
                ? picture.width / picture.height
                : DEFAULT_ASPECT_RATIO;

        const scaledWidth = aspectRatio * targetRowHeight;
        const gapSpace = currentItems.length * GAP;

        if (currentItems.length > 0 && currentRowWidth + gapSpace + scaledWidth > containerWidth) {
            // Row is full — scale to fit exactly
            rows.push(finalizeRow(currentItems, containerWidth));
            currentItems = [];
            currentRowWidth = 0;
        }

        currentItems.push({ picture, aspectRatio });
        currentRowWidth += scaledWidth;
    }

    // Last row — use target height (don't stretch)
    if (currentItems.length > 0) {
        rows.push(finalizeRow(currentItems, containerWidth, targetRowHeight));
    }

    return rows;
}

function finalizeRow(
    items: readonly { picture: Picture; aspectRatio: number }[],
    containerWidth: number,
    fixedHeight?: number,
): PictureRow {
    const totalGap = (items.length - 1) * GAP;
    const availableWidth = containerWidth - totalGap;
    const totalAspectRatio = items.reduce((sum, item) => sum + item.aspectRatio, 0);
    const rowHeight = fixedHeight ?? availableWidth / totalAspectRatio;

    return {
        height: rowHeight,
        items: items.map(item => ({
            picture: item.picture,
            width: item.aspectRatio * rowHeight,
            height: rowHeight,
        })),
    };
}
