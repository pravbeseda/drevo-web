import { Router } from '@angular/router';
import {
    createDirectiveFactory,
    SpectatorDirective,
} from '@ngneat/spectator/jest';
import { InternalLinksDirective } from './internal-links.directive';

describe('InternalLinksDirective', () => {
    let spectator: SpectatorDirective<InternalLinksDirective>;
    let router: jest.Mocked<Router>;

    const createDirective = createDirectiveFactory({
        directive: InternalLinksDirective,
        mocks: [Router],
    });

    beforeEach(() => {
        router = undefined!;
    });

    function setup(content: string): void {
        spectator = createDirective(
            `<div uiInternalLinks>${content}</div>`
        );
        router = spectator.inject(Router) as jest.Mocked<Router>;
    }

    describe('internal link navigation', () => {
        it('should navigate using router for internal links', () => {
            setup('<a href="/articles/123">Article Link</a>');

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/123');
        });

        it('should prevent default browser navigation for internal links', () => {
            setup('<a href="/articles/456">Article Link</a>');

            const link = spectator.query('a') as HTMLAnchorElement;
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            });
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

            link.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        it('should handle nested elements inside links', () => {
            setup('<a href="/articles/789"><span>Nested Text</span></a>');

            const span = spectator.query('span') as HTMLSpanElement;
            span.click();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/789');
        });
    });

    describe('external link handling', () => {
        it('should not intercept external http links', () => {
            setup('<a href="https://example.com">External</a>');

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should not intercept mailto links', () => {
            setup('<a href="mailto:test@example.com">Email</a>');

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should not intercept hash-only links', () => {
            setup('<a href="/#section">Hash Link</a>');

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });
    });

    describe('non-link clicks', () => {
        it('should not intercept clicks on non-link elements', () => {
            setup('<p>Plain text</p>');

            const paragraph = spectator.query('p') as HTMLParagraphElement;
            paragraph.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should not intercept clicks on links without href', () => {
            setup('<a>No href</a>');

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should remove event listener on destroy', () => {
            setup('<a href="/test">Link</a>');

            const hostElement = spectator.directive['elementRef'].nativeElement;
            const removeEventListenerSpy = jest.spyOn(
                hostElement,
                'removeEventListener'
            );

            spectator.directive.ngOnDestroy();

            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                'click',
                expect.any(Function)
            );
        });
    });
});
