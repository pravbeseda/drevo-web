import { resolvePicture } from './picture.resolver';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, convertToParamMap, UrlSegment } from '@angular/router';
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
    thumbnailUrl: '/images/thumbs/0000/0042.jpg',
};

function createRouteSnapshot(
    params: Record<string, string>,
    // A matched path with no matrix params is the default, so that only the
    // cases about them have to spell their segments out.
    segments: UrlSegment[] = Object.values(params).map(value => new UrlSegment(value, {})),
): ActivatedRouteSnapshot {
    return {
        paramMap: convertToParamMap(params),
        pathFromRoot: [{ url: segments } as ActivatedRouteSnapshot],
    } as ActivatedRouteSnapshot;
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

    it.each([
        // Number() reads every JavaScript literal form, and none of them is an
        // id the URL pattern or the backend names.
        ['hexadecimal', '0x2a'],
        ['exponential', '2e3'],
        ['signed', '+42'],
        ['padded with spaces', ' 42 '],
        ['padded with a leading zero', '042'],
    ])('should return not-found for an ID %s, without asking the API', (_case, id) => {
        const route = createRouteSnapshot({ id });
        let result: unknown;

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(value => (result = value));

        expect(result).toBe('not-found');
        expect(pictureService.getPicture).not.toHaveBeenCalled();
    });

    it('should return not-found when a segment carries matrix params, without asking the API', () => {
        // Angular merges `;id=42` over the positional `1`, so the paramMap reads
        // 42 under an address the route pattern never named.
        const route = createRouteSnapshot({ id: '42' }, [new UrlSegment('1', { id: '42' })]);
        let result: unknown;

        resolvePicture(pictureService as unknown as PictureService, route).subscribe(value => (result = value));

        expect(result).toBe('not-found');
        expect(pictureService.getPicture).not.toHaveBeenCalled();
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
