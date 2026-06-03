import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureClickHandler } from './picture-click.handler';
import { TestBed } from '@angular/core/testing';

describe('PictureClickHandler', () => {
    let handler: PictureClickHandler;
    let lightboxService: jest.Mocked<PictureLightboxService>;
    let host: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PictureClickHandler, { provide: PictureLightboxService, useValue: { open: jest.fn() } }],
        });
        handler = TestBed.inject(PictureClickHandler);
        lightboxService = TestBed.inject(PictureLightboxService) as jest.Mocked<PictureLightboxService>;
        host = document.createElement('div');
    });

    it('should open lightbox when clicking image inside .pic', () => {
        host.innerHTML =
            '<table class="pic"><tr><td><a href="/pictures/123"><img src="/test.jpg" /></a></td></tr></table>';
        const img = host.querySelector('img') as HTMLImageElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        const result = handler.handleClick(event, img, host);

        expect(result).toBe(true);
        expect(lightboxService.open).toHaveBeenCalledWith(123);
    });

    it('should prevent default for picture clicks', () => {
        host.innerHTML =
            '<table class="pic"><tr><td><a href="/pictures/789"><img src="/test.jpg" /></a></td></tr></table>';
        const img = host.querySelector('img') as HTMLImageElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const spy = jest.spyOn(event, 'preventDefault');

        handler.handleClick(event, img, host);

        expect(spy).toHaveBeenCalled();
    });

    it('should return false when click is not inside .pic', () => {
        host.innerHTML = '<p>Regular content</p>';
        const p = host.querySelector('p') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        const result = handler.handleClick(event, p, host);

        expect(result).toBe(false);
        expect(lightboxService.open).not.toHaveBeenCalled();
    });

    it('should return false when .pic has no valid picture link', () => {
        host.innerHTML = '<table class="pic"><tr><td class="picdesc">Caption text</td></tr></table>';
        const desc = host.querySelector('.picdesc') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        const result = handler.handleClick(event, desc, host);

        expect(result).toBe(false);
        expect(lightboxService.open).not.toHaveBeenCalled();
    });

    it('should return false when anchor href does not match /pictures/:id pattern', () => {
        host.innerHTML =
            '<table class="pic"><tr><td><a href="/articles/123"><img src="/test.jpg" /></a></td></tr></table>';
        const img = host.querySelector('img') as HTMLImageElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        const result = handler.handleClick(event, img, host);

        expect(result).toBe(false);
    });
});
