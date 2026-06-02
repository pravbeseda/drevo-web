import { InjectionToken } from '@angular/core';

export interface WikiPictureHandler {
    readonly open: (pictureId: number) => void;
}

export const WIKI_PICTURE_HANDLER = new InjectionToken<WikiPictureHandler>('WIKI_PICTURE_HANDLER');
