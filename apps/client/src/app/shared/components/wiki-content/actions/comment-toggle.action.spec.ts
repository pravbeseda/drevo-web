import { CommentToggleAction } from './comment-toggle.action';
import { TestBed } from '@angular/core/testing';

describe('CommentToggleAction', () => {
    let action: CommentToggleAction;
    let host: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [CommentToggleAction] });
        action = TestBed.inject(CommentToggleAction);
        host = document.createElement('div');
    });

    it('should have name', () => {
        expect(action.name).toBe('CommentToggle');
    });

    describe('canExecute', () => {
        it('should match toggleAll', () => {
            expect(action.canExecute('toggleAll')).toBe(true);
        });

        it('should not match other actions', () => {
            expect(action.canExecute('toggleRus')).toBe(false);
            expect(action.canExecute('toggleGroup')).toBe(false);
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
            action.execute('toggleAll', host);

            const comments = host.querySelectorAll<HTMLElement>('.cmnt');
            expect(comments[0].style.display).toBe('none');
            expect(comments[1].style.display).toBe('none');
        });

        it('should update link text when collapsing', () => {
            action.execute('toggleAll', host);

            const link = host.querySelector('.LinkComment') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Развернуть');
        });

        it('should expand comments when collapsed', () => {
            action.execute('toggleAll', host);
            action.execute('toggleAll', host);

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

            action.execute('toggleAll', host);

            const links = host.querySelectorAll<HTMLElement>('.LinkComment');
            expect(links[0].textContent?.trim()).toBe('Развернуть');
            expect(links[1].textContent?.trim()).toBe('Развернуть');
        });
    });
});
