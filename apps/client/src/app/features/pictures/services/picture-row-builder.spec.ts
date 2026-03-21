import { Picture } from '@drevo-web/shared';
import { buildRows } from './picture-row-builder';

const makePicture = (id: number, width?: number, height?: number): Picture => ({
    id,
    folder: '001',
    title: `Picture ${id}`,
    user: 'user',
    date: new Date(),
    width,
    height,
    imageUrl: `/images/001/${String(id).padStart(6, '0')}.jpg`,
    thumbnailUrl: `/pictures/thumbs/001/${String(id).padStart(6, '0')}.jpg`,
});

describe('buildRows', () => {
    it('should return empty array for empty input', () => {
        expect(buildRows([], 1000, 200)).toEqual([]);
    });

    it('should return empty array for zero container width', () => {
        expect(buildRows([makePicture(1, 800, 600)], 0, 200)).toEqual([]);
    });

    it('should create rows from pictures', () => {
        // 5 landscape pictures (4:3 aspect ratio), container 1000px, target height 200px
        // Each scaled width at 200px height = (800/600) * 200 = 266.67px
        // 3 fit in ~800px + 2*4px gap = 808px < 1000px, 4th would be 1075px > 1000px
        const pictures = Array.from({ length: 5 }, (_, i) => makePicture(i + 1, 800, 600));
        const rows = buildRows(pictures, 1000, 200);

        expect(rows.length).toBeGreaterThan(0);
        // All pictures should be present across rows
        const totalItems = rows.reduce((sum, row) => sum + row.items.length, 0);
        expect(totalItems).toBe(5);
    });

    it('should use default aspect ratio (3:4) when dimensions are missing', () => {
        const pictures = [makePicture(1, undefined, undefined)];
        const rows = buildRows(pictures, 1000, 200);

        expect(rows).toHaveLength(1);
        expect(rows[0].items).toHaveLength(1);
        // Default 3:4 aspect ratio at height 200 → width = 150
        expect(rows[0].items[0].width).toBe(150);
    });

    it('should fill row width exactly for complete rows when not thumbnail-capped', () => {
        // Use small pictures (within 250×400 thumbnail limit) so capping doesn't apply
        const pictures = Array.from({ length: 20 }, (_, i) => makePicture(i + 1, 150, 300));
        const rows = buildRows(pictures, 1000, 200);

        // Non-last rows should fill container width (items width + gaps ≈ container width)
        if (rows.length > 1) {
            const firstRow = rows[0];
            const gap = 8;
            const totalWidth =
                firstRow.items.reduce((sum, item) => sum + item.width, 0) + (firstRow.items.length - 1) * gap;
            // Container width minus right margin (GAP = 8)
            expect(totalWidth).toBeCloseTo(1000 - gap, 0);
        }
    });

    it('should preserve target height for the last row when not thumbnail-capped', () => {
        // Use small pictures (within thumbnail limit)
        const pictures = Array.from({ length: 20 }, (_, i) => makePicture(i + 1, 150, 300));
        const rows = buildRows(pictures, 1000, 200);

        const lastRow = rows[rows.length - 1];
        expect(lastRow.height).toBe(200);
    });

    it('should handle single picture', () => {
        // Small picture within thumbnail limits
        const pictures = [makePicture(1, 200, 300)];
        const rows = buildRows(pictures, 1000, 200);

        expect(rows).toHaveLength(1);
        expect(rows[0].items).toHaveLength(1);
        expect(rows[0].height).toBe(200);
    });

    it('should handle mixed aspect ratios', () => {
        const pictures = [
            makePicture(1, 1200, 800), // landscape
            makePicture(2, 600, 900), // portrait
            makePicture(3, 800, 800), // square
        ];
        const rows = buildRows(pictures, 1000, 200);

        expect(rows.length).toBeGreaterThan(0);
        const totalItems = rows.reduce((sum, row) => sum + row.items.length, 0);
        expect(totalItems).toBe(3);
    });

    it('should handle pictures with zero height using default aspect ratio', () => {
        const pictures = [makePicture(1, 800, 0)];
        const rows = buildRows(pictures, 1000, 200);

        expect(rows).toHaveLength(1);
        // Should use default 3:4 aspect ratio
        expect(rows[0].items[0].width).toBe(150);
    });

    it('should cap item height for horizontal pictures without changing row height', () => {
        // Panoramic picture: 2000×500, aspect 4:1
        // Thumbnail: scale = min(400/2000, 400/500, 1) = 0.2, thumb = 400×100
        // Row height stays at target (last row), item height capped to 100
        const pictures = [makePicture(1, 2000, 500)];
        const rows = buildRows(pictures, 1000, 200);

        expect(rows).toHaveLength(1);
        expect(rows[0].height).toBe(200);
        expect(rows[0].items[0].height).toBe(100);
        expect(rows[0].items[0].width).toBe(400);
    });

    it('should cap only constrained items while keeping others at row height', () => {
        // Portrait: 200×400, aspect=0.5, thumb scale=1, maxH=400 (uncapped at 200)
        // Wide: 800×200, aspect=4, thumb scale=0.5, maxH=100 (capped)
        // Wide container so both fit in one row
        const pictures = [makePicture(1, 200, 400), makePicture(2, 800, 200)];
        const rows = buildRows(pictures, 2000, 200);

        expect(rows).toHaveLength(1);
        expect(rows[0].height).toBe(200);
        // Portrait item: uncapped
        expect(rows[0].items[0].height).toBe(200);
        // Wide item: capped to thumbnail height
        expect(rows[0].items[1].height).toBe(100);
        expect(rows[0].items[1].width).toBe(400);
    });

    it('should cap item height for small pictures to prevent upscaling', () => {
        // Tiny picture: 100×80, already smaller than thumb limits
        // scale = min(250/100, 400/80, 1) = 1 (no upscale), maxH = 80
        const pictures = [makePicture(1, 100, 80)];
        const rows = buildRows(pictures, 1000, 200);

        expect(rows[0].height).toBe(200);
        expect(rows[0].items[0].height).toBe(80);
    });

    it('should not cap items when pictures have unknown dimensions', () => {
        const pictures = [makePicture(1, undefined, undefined)];
        const rows = buildRows(pictures, 1000, 200);

        expect(rows[0].height).toBe(200);
        expect(rows[0].items[0].height).toBe(200);
    });

    it('should ensure all row items have positive dimensions', () => {
        const pictures = Array.from({ length: 15 }, (_, i) =>
            makePicture(i + 1, 300 + i * 100, 200 + i * 50)
        );
        const rows = buildRows(pictures, 800, 180);

        for (const row of rows) {
            expect(row.height).toBeGreaterThan(0);
            for (const item of row.items) {
                expect(item.width).toBeGreaterThan(0);
                expect(item.height).toBeGreaterThan(0);
            }
        }
    });
});
