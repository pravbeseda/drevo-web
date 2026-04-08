# Discussion: Picture Row Builder — Layout Issues and Solutions

Date: 2026-04-08
Branch: `fix/pictures-width`
Status: Design phase complete, implementation plan ready

## Problem Statement

The picture gallery has a justified row layout (like Google Photos). Two issues were identified:

### Issue 1: Row width deficit for panoramic images

Rows containing panoramic or tiny images (e.g., screenshots of calendar text, wide icons) don't fill the container width. Example: at viewport 1350x760, rows 2 and 3 are only ~760px out of ~1260px available (39% deficit).

**Root cause**: The iterative capping algorithm in `finalizeRow()` prevents images from exceeding their thumbnail resolution (`THUMB_MAX_WIDTH × THUMB_MAX_HEIGHT = 400×400`). For panoramic images like 1220×280, the thumbnail is only 400×92, giving `maxDisplayHeight = 92px`. When ALL items in a row hit their cap, the row height falls to `min(maxDisplayHeights)` (e.g., 67px), and items at that height are too narrow to fill the container.

**Detailed trace for test data row 2** (pics: «Триодь» 4.36:1, «Минея» 5.97:1, «Служебник» 0.90:1):
1. Initial `uncappedAspectSum = 11.23`, `rowHeight = 1243/11.23 = 110.7`
2. «Триодь» (maxH=92): 110.7 > 92 → capped. «Минея» (maxH=67): 110.7 > 67 → capped.
3. Only «Служебник» (maxH=400) remains uncapped. `rowHeight = (1243-800)/0.896 = 493`.
4. 493 > 400 → «Служебник» also capped. ALL CAPPED.
5. Fallback: `rowHeight = min(92, 67, 400) = 67`. Items total width = 752px. **Deficit = 507px.**

### Issue 2: Scroll jumps in virtual scroller

Gallery uses `CdkVirtualScrollViewport` with `FixedSizeVirtualScrollStrategy(itemSize=208)`. Actual row heights range from 41px to 280px. The fixed-size strategy calculates scroll positions as `index × 208`, but real positions differ → elements appear/disappear at wrong times → visual jumps (especially on mobile).

**Relationship to Issue 1**: Fixing the row builder to have consistent heights (MIN_ROW_HEIGHT=200 → range 200-280px instead of 41-280px) reduces the mismatch with `itemSize=208`. But full fix requires switching to `AutoSizeVirtualScrollStrategy` (omit `itemSize`) or a custom strategy with known heights.

**Decision**: Separate task. Fix row builder first (reduces jump severity), then address scroller strategy.

## Solution Options Evaluated

### Option A: Classic Algorithm (No Capping) — REJECTED

Remove all thumbnail capping. Pure formula: `rowHeight = availableWidth / Σaspect`.

- **Pro**: Simplest algorithm (~40 lines). Always fills width. No edge cases.
- **Con**: Panoramic thumbnails upscaled 2-3× → visibly blurry. User explicitly rejected: *"категорически не нравится preview с шириной 200px растянутое на 1300px"*.
- **Reliability**: 10/10 for layout, 3/10 for visual quality.

### Option B: Classic Algorithm + `object-fit: contain` for Small Thumbnails — CONSIDERED

Layout uses pure aspect ratios (no capping). CSS renders capped items with `object-fit: contain` (letterboxed). The card occupies the correct layout slot, but the actual image is centered at its native resolution.

- **Pro**: Always fills width. Images not stretched.
- **Con**: Per-item contain logic adds complexity. Panoramic images in normal-height rows → large letterbox padding. Cards show mostly background color for extreme panoramas.
- **Reliability**: 9/10 for layout, 7/10 for visual quality. Elegant but panoramic cards look sparse.

### Option C: Classic Algorithm + MIN_ROW_HEIGHT Constraint — REJECTED

Clamp `rowHeight >= MIN_ROW_HEIGHT`. If clamped, row may overflow.

- **Problem**: MIN_ROW_HEIGHT conflicts with width-filling. Can't simultaneously enforce minimum height AND fill width when items are panoramic. The constraint changes row composition, requiring re-computation — brings back iterative complexity.
- **Reliability**: 4/10. The constraint creates new edge cases rather than solving existing ones.

### Option D: Pre-sort/Group by Height Compatibility — REJECTED

Group panoramic images into separate pool, build rows separately.

- **Problem**: Breaks chronological order. Over-engineered.
- **Reliability**: 6/10. Complex and disruptive to UX.

### Option E: Force-uncap Fallback — CONSIDERED

When all items capped, force-uncap the item with highest `maxDisplayHeight`. That item stretches to fill remaining width.

- **Pro**: Row always fills exactly.
- **Con**: `rowHeight` unpredictable (depends on ratio of capped/uncapped widths). Can produce very tall rows (400-800px). The force-uncapped item may be moderately upscaled. Panoramic items get huge letterbox padding in tall rows.
- **Reliability**: 7/10. Fills width but visual result can be jarring.

### Option F: Honest Fallback + Dynamic Gap — SELECTED ✓

Keep iterative capping (simplified to sorted single-pass). When all items capped: `rowHeight = max(MIN_ROW_HEIGHT, max(maxDisplayHeights))`. Underfilled rows distribute extra space as wider gaps between items.

- **Pro**: Simple algorithm (one-pass, no iterations). Predictable behavior. All rows visually fill container (via gaps). Panoramic items letterboxed at natural size. Normal rows unchanged.
- **Con**: All-capped rows have wider gaps than normal (but deficit is typically 3-7%, barely noticeable).
- **Reliability**: 9/10. Works for any aspect ratio combination. The only "imperfect" case (all-capped) is gracefully handled.

## Additional Topic: `<img>` vs `background-image`

Evaluated switching card rendering from `<img>` to CSS `background-image`.

### What simplifies
- Removes `--capped` CSS class (single `background-size: cover/contain`)
- Removes `height` input from card component
- Removes `isCapped` computed signal

### What complicates
- No native `loading="lazy"` (virtual scroller handles visibility, so minor impact)
- No `alt` text (need `role="img"` + `aria-label`)
- URL sanitization for `style.background-image`
- No `onerror` event for broken images

### Verdict
**Not recommended.** The simplification is marginal (saves ~10 lines), while losing native browser features. If Option A (no capping) were chosen, the `--capped` logic would be removed anyway, making background-image even less beneficial.

## Selected Solution: Option F Details

### Algorithm

```
finalizeRow(items, containerWidth):
    sort items by maxDisplayHeight ascending
    
    cappedWidthSum = 0
    uncappedAspectSum = Σ(all aspects)
    
    for item in sorted order:
        rowHeight = (availableWidth - cappedWidthSum) / uncappedAspectSum
        if rowHeight <= item.maxDisplayHeight: break  // done
        cap item: cappedWidthSum += aspect × maxH, uncappedAspectSum -= aspect
    
    if all capped:
        rowHeight = max(MIN_ROW_HEIGHT, max(maxDisplayHeights))
    else:
        rowHeight = (availableWidth - cappedWidthSum) / uncappedAspectSum
    
    compute item widths (capped: aspect × maxH, uncapped: aspect × rowHeight)
    gap = (containerWidth - totalItemsWidth) / (n-1)  // fills exactly
```

### Properties
- **One pass** (no iterative loop, no `iter < items.length` guard)
- **No floating-point drift** (sorted processing guarantees convergence)
- **All rows fill container** (full rows via item sizing, underfilled rows via gap distribution)
- **Predictable row heights**: normal rows 180-280px, capped rows 200+ (MIN_ROW_HEIGHT)

### Implementation plan
See `PLAN-picture-row-builder.md` in this repository.
