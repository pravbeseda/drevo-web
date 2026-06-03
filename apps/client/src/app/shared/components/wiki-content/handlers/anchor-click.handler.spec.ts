import { AnchorClickHandler } from './anchor-click.handler';
import { TestBed } from '@angular/core/testing';
import { WINDOW } from '@drevo-web/core';

describe('AnchorClickHandler', () => {
    let handler: AnchorClickHandler;
    let host: HTMLElement;
    let mockWindow: { location: { pathname: string; search: string }; history: { pushState: jest.Mock } };

    beforeEach(() => {
        mockWindow = {
            location: { pathname: '/articles/1', search: '' },
            history: { pushState: jest.fn() },
        };

        TestBed.configureTestingModule({
            providers: [AnchorClickHandler, { provide: WINDOW, useValue: mockWindow }],
        });
        handler = TestBed.inject(AnchorClickHandler);
        host = document.createElement('div');
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

    it('should return false for non-hash hrefs', () => {
        host.innerHTML = '<a href="/articles/123">Internal</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(handler.handleClick(event, anchor, host)).toBe(false);
    });

    it('should return false for bare # href', () => {
        host.innerHTML = '<a href="#">Bare hash</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(handler.handleClick(event, anchor, host)).toBe(false);
    });

    it('should scroll to anchor and push state for #hash links', () => {
        const targetEl = document.createElement('div');
        targetEl.setAttribute('name', 'section1');
        targetEl.scrollIntoView = jest.fn();
        document.body.appendChild(targetEl);

        host.innerHTML = '<a href="#section1">Go to section</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        const result = handler.handleClick(event, anchor, host);

        expect(result).toBe(true);
        expect(preventSpy).toHaveBeenCalled();
        expect(targetEl.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
        expect(mockWindow.history.pushState).toHaveBeenCalledWith(undefined, '', expect.stringContaining('#section1'));

        document.body.removeChild(targetEl);
    });

    it('should not push state when target element is not found', () => {
        host.innerHTML = '<a href="#nonexistent">Go</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        const result = handler.handleClick(event, anchor, host);

        expect(result).toBe(true);
        expect(mockWindow.history.pushState).not.toHaveBeenCalled();
    });
});
