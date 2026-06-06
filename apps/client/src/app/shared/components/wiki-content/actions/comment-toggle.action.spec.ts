import { CommentToggleAction } from './comment-toggle.action';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

describe('CommentToggleAction', () => {
    let spectator: SpectatorService<CommentToggleAction>;
    let host: HTMLElement;

    const createService = createServiceFactory({
        service: CommentToggleAction,
    });

    beforeEach(() => {
        spectator = createService();
        host = document.createElement('div');
    });

    it('should have name', () => {
        expect(spectator.service.name).toBe('CommentToggle');
    });

    describe('canExecute', () => {
        it('should match toggleAll', () => {
            expect(spectator.service.canExecute('toggleAll')).toBe(true);
        });

        it('should not match other actions', () => {
            expect(spectator.service.canExecute('toggleRus')).toBe(false);
            expect(spectator.service.canExecute('toggleGroup')).toBe(false);
        });
    });

    describe('execute', () => {
        beforeEach(() => {
            host.innerHTML = `
                <a class="LinkComment">Свернуть</a>
                <div class="cmnt">Comment 1</div>
                <div class="cmnt">Comment 2</div>
            `;
        });

        it('should collapse comments when expanded', () => {
            spectator.service.execute('toggleAll', host);

            const comments = host.querySelectorAll<HTMLElement>('.cmnt');
            expect(comments[0].style.display).toBe('none');
            expect(comments[1].style.display).toBe('none');
        });

        it('should update link text when collapsing', () => {
            spectator.service.execute('toggleAll', host);

            const link = host.querySelector('.LinkComment') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Развернуть');
        });

        it('should expand comments when collapsed', () => {
            spectator.service.execute('toggleAll', host);
            spectator.service.execute('toggleAll', host);

            const comments = host.querySelectorAll<HTMLElement>('.cmnt');
            expect(comments[0].style.display).toBe('');
            expect(comments[1].style.display).toBe('');

            const link = host.querySelector('.LinkComment') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Свернуть');
        });

        it('should update all toggle links', () => {
            host.innerHTML = `
                <a class="LinkComment">Свернуть</a>
                <div class="cmnt">Comment</div>
                <a class="LinkComment">Свернуть</a>
            `;

            spectator.service.execute('toggleAll', host);

            const links = host.querySelectorAll<HTMLElement>('.LinkComment');
            expect(links[0].textContent?.trim()).toBe('Развернуть');
            expect(links[1].textContent?.trim()).toBe('Развернуть');
        });

        it('should collapse bible-chapters navigation', () => {
            host.innerHTML = `
                <a class="LinkComment">Свернуть</a>
                <nav class="bible-chapters">Главы: 1 2 3</nav>
                <div class="cmnt">Comment</div>
            `;

            spectator.service.execute('toggleAll', host);

            const nav = host.querySelector('.bible-chapters') as HTMLElement;
            expect(nav.style.display).toBe('none');
        });

        it('should expand bible-chapters when toggled back', () => {
            host.innerHTML = `
                <a class="LinkComment">Свернуть</a>
                <nav class="bible-chapters">Главы: 1 2 3</nav>
            `;

            spectator.service.execute('toggleAll', host);
            spectator.service.execute('toggleAll', host);

            const nav = host.querySelector('.bible-chapters') as HTMLElement;
            expect(nav.style.display).toBe('');
        });
    });
});
