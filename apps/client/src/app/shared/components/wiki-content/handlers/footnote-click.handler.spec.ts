import { FootnoteClickHandler } from './footnote-click.handler';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { expectObjectLike } from '@drevo-web/shared/testing';
import { ModalService } from '@drevo-web/ui';

describe('FootnoteClickHandler', () => {
    let spectator: SpectatorService<FootnoteClickHandler>;
    let modalService: jest.Mocked<ModalService>;
    let host: HTMLElement;

    const createService = createServiceFactory({
        service: FootnoteClickHandler,
        providers: [mockLoggerProvider()],
        mocks: [ModalService],
    });

    beforeEach(() => {
        window.history.replaceState({}, '', '/articles/1');
        spectator = createService();
        modalService = spectator.inject(ModalService);
        host = document.createElement('div');
    });

    afterEach(() => {
        window.history.replaceState({}, '', '/');
    });

    it('should return false for non-anchor clicks', () => {
        host.innerHTML = '<p>Text</p>';
        const p = host.querySelector('p') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(spectator.service.handleClick(event, p, host)).toBe(false);
        expect(modalService.open).not.toHaveBeenCalled();
    });

    it('should ignore anchors without the footnote marker class', () => {
        host.innerHTML = '<a href="/articles/1#fn1">[1]</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
        expect(modalService.open).not.toHaveBeenCalled();
    });

    it('should not intercept when the footnote definition is missing', () => {
        host.innerHTML = '<a class="link-note" href="/articles/1#fn1">[1]</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
        expect(preventSpy).not.toHaveBeenCalled();
        expect(modalService.open).not.toHaveBeenCalled();
    });

    it('should not intercept a marker pointing to another article even if the id exists locally', () => {
        host.innerHTML =
            '<a class="link-note" href="/articles/2#fn1">[1]</a>' +
            '<div class="footnote" id="fn1"><p>Footnote text</p></div>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
        expect(preventSpy).not.toHaveBeenCalled();
        expect(modalService.open).not.toHaveBeenCalled();
    });

    it('should open a bottom-sheet modal with the footnote content on marker click', () => {
        host.innerHTML =
            '<a class="link-note" id="fnref1" href="/articles/1#fn1">[1]</a>' +
            '<div class="footnote" id="fn1"><p><a class="link-source" href="/articles/1#fnref1">[1]</a> Footnote text</p></div>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        const result = spectator.service.handleClick(event, anchor, host);

        expect(result).toBe(true);
        expect(preventSpy).toHaveBeenCalled();
        expect(modalService.open).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({
                position: 'bottom',
                data: expectObjectLike<{ label: string }>({ label: '[1]' }),
            }),
        );
    });

    it('should open its own footnote when two instances share the same id', () => {
        const marker = '<a class="link-note" href="/articles/1#fn1">[1]</a>';
        const hostA = document.createElement('div');
        hostA.innerHTML = `${marker}<div class="footnote" id="fn1"><p>Content A</p></div>`;
        const hostB = document.createElement('div');
        hostB.innerHTML = `${marker}<div class="footnote" id="fn1"><p>Content B</p></div>`;
        document.body.append(hostA, hostB);

        const anchorB = hostB.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        spectator.service.handleClick(event, anchorB, hostB);

        const html = (modalService.open.mock.calls[0][1]?.data as { html: string }).html;
        expect(html).toContain('Content B');
        expect(html).not.toContain('Content A');

        hostA.remove();
        hostB.remove();
    });

    it('should strip the back-reference link from the footnote content', () => {
        host.innerHTML =
            '<a class="link-note" id="fnref1" href="/articles/1#fn1">[1]</a>' +
            '<div class="footnote" id="fn1"><p><a class="link-source" href="/articles/1#fnref1">[1]</a> Footnote text</p></div>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        spectator.service.handleClick(event, anchor, host);

        const config = modalService.open.mock.calls[0][1];
        const html = (config?.data as { html: string }).html;
        expect(html).toContain('Footnote text');
        expect(html).not.toContain('link-source');
    });
});
