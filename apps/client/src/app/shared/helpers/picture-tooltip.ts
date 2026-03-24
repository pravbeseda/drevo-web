import { Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, hoverTooltip, Tooltip, ViewPlugin, ViewUpdate } from '@codemirror/view';
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

            fetchBatch(toFetch, options, cache, errorIds, pendingIds).then(hasChanges => {
                if (hasChanges) {
                    view.dispatch({ effects: picturesUpdated.of(undefined) });
                }
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

const PICTURE_CODE_RE = /@(\d+)@/g;

export function findPictureCodeAtPosition(lineText: string, posInLine: number): PictureCodeMatch | undefined {
    const regex = new RegExp(PICTURE_CODE_RE.source, PICTURE_CODE_RE.flags);
    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-null/no-null
    while ((match = regex.exec(lineText)) !== null) {
        const from = match.index;
        const to = from + match[0].length;

        if (posInLine >= from && posInLine <= to) {
            return { id: Number(match[1]), from, to };
        }
    }

    return undefined;
}

export function extractPictureIds(text: string): number[] {
    const regex = new RegExp(PICTURE_CODE_RE.source, PICTURE_CODE_RE.flags);
    const ids = new Set<number>();
    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-null/no-null
    while ((match = regex.exec(text)) !== null) {
        ids.add(Number(match[1]));
    }

    return Array.from(ids);
}

// --- Internal helpers ---

const MAX_BATCH_SIZE = 50;

async function fetchBatch(
    ids: number[],
    options: PictureTooltipOptions,
    cache: Map<number, Picture>,
    errorIds: Set<number>,
    pendingIds: Set<number>,
): Promise<boolean> {
    let hasChanges = false;

    for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
        const chunk = ids.slice(i, i + MAX_BATCH_SIZE);

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
        const changedText = update.state.doc.sliceString(fromB, toB);
        const regex = new RegExp(PICTURE_CODE_RE.source, PICTURE_CODE_RE.flags);
        let match: RegExpExecArray | null;

        // eslint-disable-next-line no-null/no-null
        while ((match = regex.exec(changedText)) !== null) {
            const id = Number(match[1]);
            errorIds.delete(id);
        }
    });
}

const pendingDecoration = Decoration.mark({ class: 'cm-picture-pending' });
const resolvedDecoration = Decoration.mark({ class: 'cm-picture-resolved' });
const errorDecoration = Decoration.mark({ class: 'cm-picture-error' });

function buildDecorations(
    text: string,
    cache: Map<number, Picture>,
    errorIds: Set<number>,
): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const regex = new RegExp(PICTURE_CODE_RE.source, PICTURE_CODE_RE.flags);
    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-null/no-null
    while ((match = regex.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        const id = Number(match[1]);

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
