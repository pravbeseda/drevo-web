import { resolvePicture } from './picture.resolver';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
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

    beforeEach(() => {
        pictureService = { getPicture: jest.fn() };
    });

    it('should return picture when valid ID is provided', done => {
        pictureService.getPicture.mockReturnValue(of(mockPicture));
        const route = createRouteSnapshot({ id: '42' });

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(result => {
            expect(result).toEqual(mockPicture);
            expect(pictureService.getPicture).toHaveBeenCalledWith(42);
            done();
        });
    });

    it('should return not-found for non-numeric ID', done => {
        const route = createRouteSnapshot({ id: 'abc' });

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(result => {
            expect(result).toBe('not-found');
            expect(pictureService.getPicture).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return not-found for zero ID', done => {
        const route = createRouteSnapshot({ id: '0' });

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(result => {
            expect(result).toBe('not-found');
            done();
        });
    });

    it('should return not-found for negative ID', done => {
        const route = createRouteSnapshot({ id: '-5' });

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(result => {
            expect(result).toBe('not-found');
            done();
        });
    });

    it('should return not-found for fractional ID', done => {
        const route = createRouteSnapshot({ id: '1.5' });

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(result => {
            expect(result).toBe('not-found');
            expect(pictureService.getPicture).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return not-found for missing ID param', done => {
        const route = createRouteSnapshot({});

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(result => {
            expect(result).toBe('not-found');
            done();
        });
    });

    it('should return not-found on 404 HTTP error', done => {
        pictureService.getPicture.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
        const route = createRouteSnapshot({ id: '42' });

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(result => {
            expect(result).toBe('not-found');
            done();
        });
    });

    it('should return load-error on 500 HTTP error', done => {
        pictureService.getPicture.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        const route = createRouteSnapshot({ id: '42' });

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(result => {
            expect(result).toBe('load-error');
            done();
        });
    });

    it('should return load-error on network error', done => {
        pictureService.getPicture.mockReturnValue(throwError(() => new Error('Network error')));
        const route = createRouteSnapshot({ id: '42' });

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(result => {
            expect(result).toBe('load-error');
            done();
        });
    });
});
