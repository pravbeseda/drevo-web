import { PicturePreloadService } from './picture-preload.service';
import { DOCUMENT } from '@angular/common';
import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { Picture } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

const WAIT_LIMIT_MS = 5000;

const makePicture = (id: number): Picture => ({
    id,
    folder: '001',
    title: `Picture ${id}`,
    user: 'user',
    date: new Date(),
    width: 800,
    height: 600,
    imageUrl: `/images/001/${id}.jpg`,
    thumbnailUrl: `/images/thumbs/001/${id}.jpg`,
});

describe('PicturePreloadService', () => {
    let spectator: SpectatorService<PicturePreloadService>;
    let images: HTMLImageElement[];
    let onPage: jest.Mock;

    const page = { items: [makePicture(1), makePicture(2)] };

    const createService = createServiceFactory({
        service: PicturePreloadService,
        providers: [
            mockLoggerProvider(),
            {
                provide: DOCUMENT,
                useValue: {
                    createElement: (): HTMLImageElement => {
                        const image = new Image();
                        images.push(image);
                        return image;
                    },
                },
            },
        ],
    });

    beforeEach(() => {
        jest.useFakeTimers();
        images = [];
        onPage = jest.fn();
        spectator = createService();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should request the thumbnail of every picture', () => {
        spectator.service.whenThumbnailsLoaded(page).subscribe(onPage);

        expect(images.map(image => image.getAttribute('src'))).toEqual([
            '/images/thumbs/001/1.jpg',
            '/images/thumbs/001/2.jpg',
        ]);
    });

    it('should hold the page while a thumbnail is still loading', () => {
        spectator.service.whenThumbnailsLoaded(page).subscribe(onPage);

        images[0].dispatchEvent(new Event('load'));

        expect(onPage).not.toHaveBeenCalled();
    });

    it('should hand over the page once every thumbnail has loaded', () => {
        spectator.service.whenThumbnailsLoaded(page).subscribe(onPage);

        images.forEach(image => image.dispatchEvent(new Event('load')));

        expect(onPage).toHaveBeenCalledTimes(1);
        expect(onPage).toHaveBeenCalledWith(page);
    });

    it('should not let a broken thumbnail hold the page, and log it', () => {
        spectator.service.whenThumbnailsLoaded(page).subscribe(onPage);

        images[0].dispatchEvent(new Event('error'));
        images[1].dispatchEvent(new Event('load'));

        expect(onPage).toHaveBeenCalledWith(page);
        expect(spectator.inject(LoggerService).withContext('').warn).toHaveBeenCalled();
    });

    it('should hand over the page when the thumbnails take too long', () => {
        spectator.service.whenThumbnailsLoaded(page).subscribe(onPage);

        jest.advanceTimersByTime(WAIT_LIMIT_MS - 1);
        expect(onPage).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(onPage).toHaveBeenCalledWith(page);
    });

    it('should hand over a page without pictures at once', () => {
        const emptyPage = { items: [] };

        spectator.service.whenThumbnailsLoaded(emptyPage).subscribe(onPage);

        expect(onPage).toHaveBeenCalledWith(emptyPage);
    });
});
