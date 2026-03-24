import { Extension } from '@codemirror/state';
import { hoverTooltip, Tooltip } from '@codemirror/view';
import { Picture } from '@drevo-web/shared';
import { firstValueFrom, Observable } from 'rxjs';

export interface PictureTooltipOptions {
    readonly getPicture: (id: number) => Observable<Picture>;
    readonly onPictureClick: (id: number) => void;
}

interface PictureCodeMatch {
    readonly id: number;
    readonly from: number;
    readonly to: number;
}

export function findPictureCodeAtPosition(lineText: string, posInLine: number): PictureCodeMatch | undefined {
    const regex = /@(\d+)@/g;
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

export function createPictureTooltip(options: PictureTooltipOptions): Extension {
    const cache = new Map<number, Picture>();

    return hoverTooltip(
        async (view, pos) => {
            const line = view.state.doc.lineAt(pos);
            const posInLine = pos - line.from;
            const found = findPictureCodeAtPosition(line.text, posInLine);

            if (!found) {
                // eslint-disable-next-line no-null/no-null
                return null;
            }

            const absoluteFrom = line.from + found.from;
            const absoluteTo = line.from + found.to;

            let picture = cache.get(found.id);

            if (!picture) {
                try {
                    picture = await firstValueFrom(options.getPicture(found.id));
                    cache.set(found.id, picture);
                } catch {
                    // eslint-disable-next-line no-null/no-null
                    return null;
                }
            }

            const tooltip: Tooltip = {
                pos: absoluteFrom,
                end: absoluteTo,
                above: true,
                create: () => {
                    const container = document.createElement('div');
                    container.className = 'cm-picture-tooltip';
                    container.addEventListener('click', () => options.onPictureClick(found.id));

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
                },
            };

            return tooltip;
        },
        { hoverTime: 300, hideOnChange: true },
    );
}
