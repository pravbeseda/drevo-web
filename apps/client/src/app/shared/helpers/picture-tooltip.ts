import { MAX_PICTURES_BATCH_SIZE } from '../../services/pictures/picture.constants';
import { Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, hoverTooltip, Tooltip, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { createPictureMarkerRegex } from '@drevo-web/editor';
import { PictureBatchResponse, Picture } from '@drevo-web/shared';
import { firstValueFrom, Observable } from 'rxjs';

// --- Public API ---

export interface PictureTooltipOptions {
    readonly getPicturesBatch: (ids: readonly number[]) => Observable<PictureBatchResponse>;
    readonly onPictureClick: (id: number) => void;
}

export function createPicturePreviewExtension(options: PictureTooltipOptions): Extension {
    const picturesUpdated = StateEffect.define<void>();

    const cache = new Map<number, Picture>();
    const errorIds = new Set<number>();
    const pendingIds = new Set<number>();

    const decorationField = StateField.define<DecorationSet>({
        create: state => buildDecorations(state.doc.toString(), cache, errorIds),
        update: (decorations, tr) => {
            if (tr.docChanged || tr.effects.some(e => e.is(picturesUpdated))) {
                return buildDecorations(tr.newDoc.toString(), cache, errorIds);
            }
            return decorations;
        },
        provide: f => EditorView.decorations.from(f),
    });

    const fetchPlugin = ViewPlugin.define(view => {
        function scheduleResolve(): void {
            const ids = extractPictureIds(view.state.doc.toString());
            const toFetch = ids.filter(id => !cache.has(id) && !pendingIds.has(id) && !errorIds.has(id));

            if (toFetch.length === 0) {
                return;
            }

            for (const id of toFetch) {
                pendingIds.add(id);
            }

            fetchBatch(toFetch, options, cache, errorIds, pendingIds)
                .then(hasChanges => {
                    if (hasChanges) {
                        view.dispatch({ effects: picturesUpdated.of(undefined) });
                    }
                })
                .catch(() => {
                    // noop — view may already be destroyed
                });
        }

        scheduleResolve();

        return {
            update(update: ViewUpdate) {
                if (update.docChanged) {
                    retryEditedErrors(update, errorIds);
                    scheduleResolve();
                }
            },
        };
    });

    const tooltip = hoverTooltip(
        (view, pos) => {
            const line = view.state.doc.lineAt(pos);
            const posInLine = pos - line.from;
            const found = findPictureCodeAtPosition(line.text, posInLine);

            if (!found) {
                // eslint-disable-next-line no-null/no-null
                return null;
            }

            const picture = cache.get(found.id);
            if (!picture) {
                // eslint-disable-next-line no-null/no-null
                return null;
            }

            const absoluteFrom = line.from + found.from;
            const absoluteTo = line.from + found.to;

            const result: Tooltip = {
                pos: absoluteFrom,
                end: absoluteTo,
                above: true,
                create: () => createTooltipDom(picture, found.id, options.onPictureClick),
            };

            return result;
        },
        { hoverTime: 100, hideOnChange: true },
    );

    return [decorationField, fetchPlugin, tooltip];
}

// --- Pure helpers (exported for testing) ---

export interface PictureCodeMatch {
    readonly id: number;
    readonly from: number;
    readonly to: number;
}

function parsePictureId(match: RegExpExecArray): number {
    return Math.abs(Number(match[1]));
}

export function findPictureCodeAtPosition(lineText: string, posInLine: number): PictureCodeMatch | undefined {
    const regex = createPictureMarkerRegex();
    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-null/no-null
    while ((match = regex.exec(lineText)) !== null) {
        const from = match.index;
        const to = from + match[0].length;

        if (posInLine >= from && posInLine <= to) {
            return { id: parsePictureId(match), from, to };
        }
    }

    return undefined;
}

export function extractPictureIds(text: string): number[] {
    const regex = createPictureMarkerRegex();
    const ids = new Set<number>();
    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-null/no-null
    while ((match = regex.exec(text)) !== null) {
        ids.add(parsePictureId(match));
    }

    return Array.from(ids);
}

// --- Internal helpers ---

async function fetchBatch(
    ids: number[],
    options: PictureTooltipOptions,
    cache: Map<number, Picture>,
    errorIds: Set<number>,
    pendingIds: Set<number>,
): Promise<boolean> {
    let hasChanges = false;

    for (let i = 0; i < ids.length; i += MAX_PICTURES_BATCH_SIZE) {
        const chunk = ids.slice(i, i + MAX_PICTURES_BATCH_SIZE);

        try {
            const response = await firstValueFrom(options.getPicturesBatch(chunk));
            for (const picture of response.items) {
                cache.set(picture.id, picture);
                hasChanges = true;
            }
            for (const id of response.notFoundIds) {
                errorIds.add(id);
                hasChanges = true;
            }
        } catch {
            for (const id of chunk) {
                errorIds.add(id);
                hasChanges = true;
            }
        }

        for (const id of chunk) {
            pendingIds.delete(id);
        }
    }

    return hasChanges;
}

function retryEditedErrors(update: ViewUpdate, errorIds: Set<number>): void {
    if (errorIds.size === 0) {
        return;
    }

    update.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
        // Scan whole lines, because a deletion reports an empty range and would otherwise
        // hide the marker it happened inside — then keep only the markers the edit touched,
        // so typing elsewhere on the line does not resurrect a known-missing id.
        const doc = update.state.doc;
        const scanFrom = doc.lineAt(fromB).from;
        const scannedText = doc.sliceString(scanFrom, doc.lineAt(toB).to);
        const regex = createPictureMarkerRegex();
        let match: RegExpExecArray | null;

        // eslint-disable-next-line no-null/no-null
        while ((match = regex.exec(scannedText)) !== null) {
            const markerFrom = scanFrom + match.index;
            const markerTo = markerFrom + match[0].length;

            // Strict comparisons: an edit that merely abuts the marker leaves it unchanged,
            // while the sign deletion that motivates the line scan falls strictly inside it.
            if (markerTo > fromB && markerFrom < toB) {
                errorIds.delete(parsePictureId(match));
            }
        }
    });
}

const pendingDecoration = Decoration.mark({ class: 'cm-picture-pending' });
const resolvedDecoration = Decoration.mark({ class: 'cm-picture-resolved' });
const errorDecoration = Decoration.mark({ class: 'cm-picture-error' });

function buildDecorations(text: string, cache: Map<number, Picture>, errorIds: Set<number>): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const regex = createPictureMarkerRegex();
    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-null/no-null
    while ((match = regex.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        const id = parsePictureId(match);

        if (cache.has(id)) {
            builder.add(from, to, resolvedDecoration);
        } else if (errorIds.has(id)) {
            builder.add(from, to, errorDecoration);
        } else {
            builder.add(from, to, pendingDecoration);
        }
    }

    return builder.finish();
}

// Direct `document` access is safe here: CM6 is browser-only and
// EditorComponent guards creation with `isServer()` check.
function createTooltipDom(
    picture: Picture,
    pictureId: number,
    onPictureClick: (id: number) => void,
): { dom: HTMLElement; offset: { x: number; y: number } } {
    const container = document.createElement('div');
    container.className = 'cm-picture-tooltip';
    container.addEventListener('click', () => onPictureClick(pictureId));

    const img = document.createElement('img');
    img.src = picture.thumbnailUrl;
    img.alt = picture.title;
    container.appendChild(img);

    if (picture.title) {
        const title = document.createElement('span');
        title.className = 'cm-picture-tooltip-title';
        title.textContent = picture.title;
        container.appendChild(title);
    }

    return { dom: container, offset: { x: 0, y: 4 } };
}
