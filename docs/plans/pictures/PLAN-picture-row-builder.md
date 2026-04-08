# Plan: Picture Row Builder — Approach B (Honest Fallback + Dynamic Gap)

## Goal

Fix rows with panoramic/tiny images not filling container width. Simplify the capping algorithm, eliminate floating-point fragility, and ensure every row visually fills the container via dynamic gap distribution.

## Context

- File: `apps/client/src/app/features/picture/services/picture-row-builder.ts`
- Failing test: `testing/playwright/tests/pictures/picture-gallery.spec.ts` — "keeps illustration rows within viewport width at 1350x760"
- Root cause: when all items in a row hit their thumbnail cap, the row can't fill container width (e.g., 768px out of 1259px — 39% deficit)

## Design Decisions

1. **Sorted single-pass capping** replaces the iterative loop — process items from lowest `maxDisplayHeight` upward, break when `rowHeight <= item.maxH`. Mathematically guaranteed: if `rowHeight <= maxH[i]`, then `rowHeight <= maxH[j]` for all `j > i` (sorted ascending, and rowHeight can only decrease as items are capped). One pass, no iteration counter, no floating-point drift.

2. **All-capped fallback**: `rowHeight = max(MIN_ROW_HEIGHT, max(maxDisplayHeights))` — use the **maximum** maxH (not minimum as now), so the tallest item is fully utilized. Capped items are letterboxed (centered vertically in the card, background color fills padding).

3. **Dynamic gap per row**: each `PictureRow` includes a computed `gap`. For full rows, `gap ≈ GAP` (8px). For underfilled rows, gap is wider so that `totalItemsWidth + (n-1) * gap = containerWidth`. This absorbs both underflow AND rounding errors from `Math.round()`.

4. **`MIN_ROW_HEIGHT = 200`**: floor for row height in the all-capped fallback. Prevents visually tiny rows (current 41-67px).

5. **No changes to filling phase**: the current heuristic (`effectiveHeight = min(targetHeight, maxDisplayHeight)`) correctly predicts each item's actual rendered width. No need to change row composition logic.

6. **No changes to card component rendering**: the existing `--capped` CSS class already handles letterboxing (flex centering, `height: auto`, `max-height` constraint). Only the row component changes (dynamic gap binding).

## Implementation Steps

### Step 1: Update `PictureRow` interface

In `picture-row-builder.ts`, add `gap` to `PictureRow`:

```typescript
export interface PictureRow {
    readonly items: readonly PictureRowItem[];
    readonly height: number;
    readonly gap: number;
}
```

### Step 2: Add `MIN_ROW_HEIGHT` constant

```typescript
const MIN_ROW_HEIGHT = 200;
```

### Step 3: Rewrite `finalizeRow` — sorted single-pass capping

Replace the current iterative capping loop with sorted single-pass:

```typescript
function finalizeRow(items: readonly RowEntry[], containerWidth: number, fixedHeight?: number): PictureRow {
    const totalGap = (items.length - 1) * GAP;
    const availableWidth = containerWidth - totalGap;

    if (fixedHeight !== undefined) {
        return buildRowResult(items, fixedHeight, containerWidth);
    }

    // Sort indices by maxDisplayHeight ascending
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

    return buildRowResult(items, rowHeight, containerWidth);
}
```

### Step 4: Update `buildRowResult` — compute dynamic gap

```typescript
function buildRowResult(
    items: readonly RowEntry[],
    rowHeight: number,
    containerWidth: number,
): PictureRow {
    const resultItems = items.map(item => {
        const itemHeight = Math.min(rowHeight, item.maxDisplayHeight);
        return {
            picture: item.picture,
            width: Math.round(item.aspectRatio * itemHeight),
            height: Math.round(itemHeight),
        };
    });

    const totalItemsWidth = resultItems.reduce((sum, item) => sum + item.width, 0);
    const gap = items.length > 1
        ? (containerWidth - totalItemsWidth) / (items.length - 1)
        : 0;

    return { height: rowHeight, items: resultItems, gap };
}
```

### Step 5: Remove `sumUncappedAspects` helper

No longer needed — aspect sum is computed inline in `finalizeRow`.

### Step 6: Update `PictureRowComponent` template

In `picture-row.component.html`, bind dynamic gap:

```html
<div class="picture-row" [style.height.px]="row().height" [style.gap.px]="row().gap">
```

### Step 7: Update `picture-row.component.scss`

Remove the hardcoded gap (dynamic gap is now via inline style):

```scss
.picture-row {
    display: flex;
    // gap is set dynamically via [style.gap.px]
    margin-bottom: $picture-gap;
}
```

The `$picture-gap` variable is still used for `margin-bottom`. Remove the `// Keep in sync with GAP` comment or update it to clarify GAP is only used for row building calculations, not CSS gap.

### Step 8: Update unit tests (`picture-row-builder.spec.ts`)

1. All existing tests: update expectations to include `gap` field in returned rows
2. Update the "astronomical row height" regression test — the sorted approach eliminates this edge case by design, but verify the all-capped fallback produces sane values
3. Add new test: **all-capped row uses MIN_ROW_HEIGHT**
   - Input: 3 panoramic pictures (e.g., 1200×100, 1000×80, 1100×90)
   - Assert: `row.height >= MIN_ROW_HEIGHT`
   - Assert: `row.gap > GAP` (wider gaps to fill container)
   - Assert: `totalItemsWidth + (n-1)*gap ≈ containerWidth`
4. Add new test: **mixed row (capped + uncapped) fills container exactly**
   - Input: 2 panoramic + 1 portrait in a row
   - Assert: total width (items + gaps) = containerWidth ± 1px
5. Add new test: **dynamic gap absorbs rounding errors**
   - Verify that `totalItemsWidth + (n-1)*gap ≈ containerWidth` for normal rows too

### Step 9: Update Playwright test expectations

The existing layout test should now pass — verify:
- All non-last rows have equal total width (items + gaps)
- Total width ≤ viewport width
- The tolerance check (4px) should be easily met since dynamic gap fills exactly

### Step 10: Update `picture-row.component.spec.ts`

Update the row component unit test to include `gap` in the test row data.

## What Does NOT Change

- **Card component** (`picture-card.component.*`): no changes. The existing `--capped` class and `object-fit` logic already handles letterboxing correctly.
- **Filling phase** in `buildRows`: no changes to how items are assigned to rows.
- **`getMaxDisplayHeight`**: no changes.
- **`containerWidth -= GAP`** (right margin): kept as-is.
- **`RowEntry` interface**: no changes.
- **`PictureRowItem` interface**: no changes.

## Verification

1. `yarn nx test client` — unit tests pass
2. `yarn test:playwright --grep "keeps illustration rows"` — Playwright layout test passes
3. Visual check: panoramic images are letterboxed with wider gaps, normal rows look unchanged
