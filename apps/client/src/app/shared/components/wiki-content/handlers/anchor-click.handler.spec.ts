import { AnchorClickHandler } from './anchor-click.handler';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { WINDOW } from '@drevo-web/core';

describe('AnchorClickHandler', () => {
    let spectator: SpectatorService<AnchorClickHandler>;
    let host: HTMLElement;
    let mockWindow: { location: { pathname: string; search: string }; history: { pushState: jest.Mock } };

    const createService = createServiceFactory({
        service: AnchorClickHandler,
        providers: [
            {
                provide: WINDOW,
                useFactory: () => ({
                    location: { pathname: '/articles/1', search: '' },
                    history: { pushState: jest.fn() },
                }),
            },
        ],
    });

    beforeEach(() => {
        spectator = createService();
        mockWindow = spectator.inject(WINDOW) as typeof mockWindow;
        host = document.createElement('div');
    });

    it('should return false for non-anchor clicks', () => {
        host.innerHTML = '<p>Text</p>';
        const p = host.querySelector('p') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(spectator.service.handleClick(event, p, host)).toBe(false);
    });

    it('should return false for anchors without href', () => {
        host.innerHTML = '<a>No href</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
    });

    it('should return false for non-hash hrefs', () => {
        host.innerHTML = '<a href="/articles/123">Internal</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
    });

    it('should return false for bare # href', () => {
        host.innerHTML = '<a href="#">Bare hash</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
    });

    it('should scroll to anchor and push state for #hash links', () => {
        host.innerHTML = '<a href="#section1">Go to section</a><div name="section1"></div>';
        const anchor = host.querySelector('a') as HTMLElement;
        const targetEl = host.querySelector('[name="section1"]') as HTMLElement;
        targetEl.scrollIntoView = jest.fn();
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        const result = spectator.service.handleClick(event, anchor, host);

        expect(result).toBe(true);
        expect(preventSpy).toHaveBeenCalled();
        expect(targetEl.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
        expect(mockWindow.history.pushState).toHaveBeenCalledWith(undefined, '', expect.stringContaining('#section1'));
    });

    it('should scroll to anchor for same-page path-prefixed links', () => {
        host.innerHTML = '<a href="/articles/1#fn5">5</a><div name="fn5"></div>';
        const anchor = host.querySelector('a') as HTMLElement;
        const targetEl = host.querySelector('[name="fn5"]') as HTMLElement;
        targetEl.scrollIntoView = jest.fn();
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        const result = spectator.service.handleClick(event, anchor, host);

        expect(result).toBe(true);
        expect(preventSpy).toHaveBeenCalled();
        expect(targetEl.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('should not scroll a matching target that lives in another instance', () => {
        const otherHost = document.createElement('div');
        otherHost.innerHTML = '<div id="section1"></div>';
        const otherTarget = otherHost.querySelector('#section1') as HTMLElement;
        otherTarget.scrollIntoView = jest.fn();
        document.body.appendChild(otherHost);

        host.innerHTML = '<a href="#section1">Go</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        const result = spectator.service.handleClick(event, anchor, host);

        expect(result).toBe(false);
        expect(preventSpy).not.toHaveBeenCalled();
        expect(otherTarget.scrollIntoView).not.toHaveBeenCalled();
        expect(mockWindow.history.pushState).not.toHaveBeenCalled();

        document.body.removeChild(otherHost);
    });

    it('should not intercept path-prefixed links pointing to another page', () => {
        host.innerHTML = '<a href="/articles/2#fn5">5</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
    });

    it('should not claim the click when the target element is not found in this host', () => {
        host.innerHTML = '<a href="#nonexistent">Go</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        const result = spectator.service.handleClick(event, anchor, host);

        expect(result).toBe(false);
        expect(preventSpy).not.toHaveBeenCalled();
        expect(mockWindow.history.pushState).not.toHaveBeenCalled();
    });
});
