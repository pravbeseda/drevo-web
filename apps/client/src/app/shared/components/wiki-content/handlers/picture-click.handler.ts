import { WikiClickHandler } from './wiki-click-handler';
import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class PictureClickHandler implements WikiClickHandler {
    private readonly pictureLightboxService = inject(PictureLightboxService);

    handleClick(event: MouseEvent, target: HTMLElement): boolean {
        if (!target.closest('.pic')) {
            return false;
        }

        const pictureId = this.extractPictureId(target);
        if (pictureId === undefined) {
            return false;
        }

        event.preventDefault();
        this.pictureLightboxService.open(pictureId);
        return true;
    }

    private extractPictureId(target: HTMLElement): number | undefined {
        const anchor = target.closest('a');
        const href = anchor?.getAttribute('href');
        if (!href) {
            return undefined;
        }

        const match = /^\/pictures\/(\d+)$/.exec(href);
        if (!match) {
            return undefined;
        }

        return Number(match[1]);
    }
}
