import { Location } from '@angular/common';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { WINDOW } from '@drevo-web/core';
import { Picture } from '@drevo-web/shared';
import { of, Subject, throwError } from 'rxjs';
import { PictureLightboxService } from './picture-lightbox.service';
import { PictureService } from './picture.service';

describe('PictureLightboxService', () => {
    let spectator: SpectatorService<PictureLightboxService>;
    let pictureService: jest.Mocked<PictureService>;
    let location: jest.Mocked<Location>;

    const mockPicture: Picture = {
        id: 123,
        folder: '004',
        title: 'Храм Христа Спасителя',
        user: 'Иван',
        date: new Date('2025-03-10'),
        width: 800,
        height: 600,
        imageUrl: '/images/004/000123.jpg',
        thumbnailUrl: '/pictures/thumbs/004/000123.jpg',
    };

    const createService = createServiceFactory({
        service: PictureLightboxService,
        mocks: [PictureService, Location],
        providers: [
            mockLoggerProvider(),
            { provide: WINDOW, useValue: window },
        ],
    });

    beforeEach(() => {
        spectator = createService();
        pictureService = spectator.inject(PictureService) as jest.Mocked<PictureService>;
        location = spectator.inject(Location) as jest.Mocked<Location>;
        location.path.mockReturnValue('/articles/1');
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    describe('open', () => {
        it('should set isOpen and isLoading to true', () => {
            const subject = new Subject<Picture>();
            pictureService.getPicture.mockReturnValue(subject.asObservable());

            spectator.service.open(123);

            expect(spectator.service.isOpen()).toBe(true);
            expect(spectator.service.isLoading()).toBe(true);
        });

        it('should load picture and set currentPicture', () => {
            pictureService.getPicture.mockReturnValue(of(mockPicture));

            spectator.service.open(123);

            expect(pictureService.getPicture).toHaveBeenCalledWith(123);
            expect(spectator.service.currentPicture()).toEqual(mockPicture);
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should push hash to browser history', () => {
            pictureService.getPicture.mockReturnValue(of(mockPicture));

            spectator.service.open(123);

            expect(location.go).toHaveBeenCalledWith('/articles/1#picture=123');
        });

        it('should reset zoom on open', () => {
            pictureService.getPicture.mockReturnValue(of(mockPicture));

            spectator.service.open(123);

            expect(spectator.service.isZoomed()).toBe(false);
        });

        it('should close on load error', () => {
            pictureService.getPicture.mockReturnValue(throwError(() => new Error('Not found')));

            spectator.service.open(999);

            expect(spectator.service.isOpen()).toBe(false);
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should cancel previous request when opening another picture', () => {
            const firstSubject = new Subject<Picture>();
            const secondPicture: Picture = { ...mockPicture, id: 456, title: 'Вторая картинка' };

            pictureService.getPicture.mockReturnValue(firstSubject.asObservable());
            spectator.service.open(123);

            const secondSubject = new Subject<Picture>();
            pictureService.getPicture.mockReturnValue(secondSubject.asObservable());
            spectator.service.open(456);

            // First request completes — should be ignored (cancelled by switchMap)
            firstSubject.next(mockPicture);
            expect(spectator.service.currentPicture()).toBeUndefined();
            expect(spectator.service.isLoading()).toBe(true);

            // Second request completes — should be applied
            secondSubject.next(secondPicture);
            expect(spectator.service.currentPicture()?.id).toBe(456);
            expect(spectator.service.isLoading()).toBe(false);
        });
    });

    describe('close', () => {
        it('should reset all state', () => {
            pictureService.getPicture.mockReturnValue(of(mockPicture));
            spectator.service.open(123);

            spectator.service.close();

            expect(spectator.service.isOpen()).toBe(false);
            expect(spectator.service.currentPicture()).toBeUndefined();
            expect(spectator.service.isLoading()).toBe(false);
            expect(spectator.service.isZoomed()).toBe(false);
        });

        it('should navigate back to remove hash when closed by user action', () => {
            pictureService.getPicture.mockReturnValue(of(mockPicture));
            spectator.service.open(123);

            spectator.service.close();

            expect(location.back).toHaveBeenCalled();
        });

        it('should not do anything if already closed', () => {
            spectator.service.close();

            expect(location.back).not.toHaveBeenCalled();
        });
    });

    describe('toggleZoom', () => {
        it('should toggle zoom state', () => {
            expect(spectator.service.isZoomed()).toBe(false);

            spectator.service.toggleZoom();
            expect(spectator.service.isZoomed()).toBe(true);

            spectator.service.toggleZoom();
            expect(spectator.service.isZoomed()).toBe(false);
        });
    });

    describe('popstate handling', () => {
        it('should close lightbox on popstate (Back button)', () => {
            pictureService.getPicture.mockReturnValue(of(mockPicture));
            spectator.service.open(123);

            window.dispatchEvent(new PopStateEvent('popstate'));

            expect(spectator.service.isOpen()).toBe(false);
        });

        it('should not call location.back when closed by popstate', () => {
            pictureService.getPicture.mockReturnValue(of(mockPicture));
            spectator.service.open(123);
            location.back.mockClear();

            window.dispatchEvent(new PopStateEvent('popstate'));

            expect(location.back).not.toHaveBeenCalled();
        });
    });
});
