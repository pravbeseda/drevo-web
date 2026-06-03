import { InternalLinkClickHandler } from './internal-link-click.handler';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

describe('InternalLinkClickHandler', () => {
    let handler: InternalLinkClickHandler;
    let router: jest.Mocked<Router>;
    let host: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [InternalLinkClickHandler, { provide: Router, useValue: { navigateByUrl: jest.fn() } }],
        });
        handler = TestBed.inject(InternalLinkClickHandler);
        router = TestBed.inject(Router) as jest.Mocked<Router>;
        host = document.createElement('div');
    });

    it('should navigate for internal links', () => {
        host.innerHTML = '<a href="/articles/123">Article</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        const result = handler.handleClick(event, anchor, host);

        expect(result).toBe(true);
        expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/123');
    });

    it('should prevent default for internal links', () => {
        host.innerHTML = '<a href="/articles/456">Article</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const spy = jest.spyOn(event, 'preventDefault');

        handler.handleClick(event, anchor, host);

        expect(spy).toHaveBeenCalled();
    });

    it('should handle nested elements inside links', () => {
        host.innerHTML = '<a href="/articles/789"><span>Nested</span></a>';
        const span = host.querySelector('span') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        const result = handler.handleClick(event, span, host);

        expect(result).toBe(true);
        expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/789');
    });

    it('should return false for external http links', () => {
        host.innerHTML = '<a href="https://example.com">External</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(handler.handleClick(event, anchor, host)).toBe(false);
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should return false for mailto links', () => {
        host.innerHTML = '<a href="mailto:test@example.com">Email</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(handler.handleClick(event, anchor, host)).toBe(false);
    });

    it('should return false for hash-only links (/#section)', () => {
        host.innerHTML = '<a href="/#section">Hash</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(handler.handleClick(event, anchor, host)).toBe(false);
    });

    it('should return false for non-anchor clicks', () => {
        host.innerHTML = '<p>Text</p>';
        const p = host.querySelector('p') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(handler.handleClick(event, p, host)).toBe(false);
    });

    it('should return false for anchors without href', () => {
        host.innerHTML = '<a>No href</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(handler.handleClick(event, anchor, host)).toBe(false);
    });
});
