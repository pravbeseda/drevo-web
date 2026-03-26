import { resolvePicture } from './picture.resolver';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { PictureService } from '../../../services/pictures/picture.service';
import { Picture } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';

const mockPicture: Picture = {
    id: 42,
    folder: '0000',
    title: 'Test picture',
    user: 'TestUser',
    date: new Date('2025-01-15'),
    width: 800,
    height: 600,
    imageUrl: '/images/0000/0042.jpg',
    thumbnailUrl: '/pictures/thumbs/0000/0042.jpg',
};

function createRouteSnapshot(params: Record<string, string>): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
}

describe('resolvePicture', () => {
    let pictureService: jest.Mocked<Pick<PictureService, 'getPicture'>>;
    let router: jest.Mocked<Pick<Router, 'navigate'>>;

    beforeEach(() => {
        pictureService = { getPicture: jest.fn() };
        router = { navigate: jest.fn() };
    });

    it('should return picture when valid ID is provided', done => {
        pictureService.getPicture.mockReturnValue(of(mockPicture));
        const route = createRouteSnapshot({ id: '42' });

        resolvePicture(
            pictureService as unknown as PictureService,
            router as unknown as Router,
            route
        ).subscribe(result => {
            expect(result).toEqual(mockPicture);
            expect(pictureService.getPicture).toHaveBeenCalledWith(42);
            expect(router.navigate).not.toHaveBeenCalled();
            done();
        });
    });

    it('should redirect to /pictures for non-numeric ID', () => {
        const route = createRouteSnapshot({ id: 'abc' });

        const result$ = resolvePicture(
            pictureService as unknown as PictureService,
            router as unknown as Router,
            route
        );

        let emitted = false;
        result$.subscribe(() => (emitted = true));

        expect(emitted).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/pictures']);
        expect(pictureService.getPicture).not.toHaveBeenCalled();
    });

    it('should redirect to /pictures for zero ID', () => {
        const route = createRouteSnapshot({ id: '0' });

        const result$ = resolvePicture(
            pictureService as unknown as PictureService,
            router as unknown as Router,
            route
        );

        let emitted = false;
        result$.subscribe(() => (emitted = true));

        expect(emitted).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/pictures']);
    });

    it('should redirect to /pictures for negative ID', () => {
        const route = createRouteSnapshot({ id: '-5' });

        const result$ = resolvePicture(
            pictureService as unknown as PictureService,
            router as unknown as Router,
            route
        );

        let emitted = false;
        result$.subscribe(() => (emitted = true));

        expect(emitted).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/pictures']);
    });

    it('should redirect to /pictures for missing ID param', () => {
        const route = createRouteSnapshot({});

        const result$ = resolvePicture(
            pictureService as unknown as PictureService,
            router as unknown as Router,
            route
        );

        let emitted = false;
        result$.subscribe(() => (emitted = true));

        expect(emitted).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/pictures']);
    });

    it('should return undefined on HTTP error', done => {
        pictureService.getPicture.mockReturnValue(throwError(() => new Error('Server error')));
        const route = createRouteSnapshot({ id: '42' });

        resolvePicture(
            pictureService as unknown as PictureService,
            router as unknown as Router,
            route
        ).subscribe(result => {
            expect(result).toBeUndefined();
            done();
        });
    });
});
