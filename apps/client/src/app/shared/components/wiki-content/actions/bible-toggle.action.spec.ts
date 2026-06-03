import { BibleToggleAction } from './bible-toggle.action';
import { TestBed } from '@angular/core/testing';

describe('BibleToggleAction', () => {
    let action: BibleToggleAction;
    let host: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [BibleToggleAction] });
        action = TestBed.inject(BibleToggleAction);
        host = document.createElement('div');
    });

    it('should have name', () => {
        expect(action.name).toBe('BibleToggle');
    });

    describe('canExecute', () => {
        it('should match toggleRus', () => {
            expect(action.canExecute('toggleRus')).toBe(true);
        });

        it('should match toggleCsl', () => {
            expect(action.canExecute('toggleCsl')).toBe(true);
        });

        it('should not match other actions', () => {
            expect(action.canExecute('toggleAll')).toBe(false);
            expect(action.canExecute('toggleGroup')).toBe(false);
        });
    });

    describe('toggleRus', () => {
        beforeEach(() => {
            host.innerHTML = `
                <a class="toggleRus">Скрыть русский перевод</a>
                <a class="toggleCsl">Скрыть церковнославянский перевод</a>
                <div class="BibleRus">Russian text</div>
                <div class="BibleCsl">Church Slavonic text</div>
            `;
        });

        it('should hide Russian translation', () => {
            action.execute('toggleRus', host);

            const rusEl = host.querySelector('.BibleRus') as HTMLElement;
            expect(rusEl.style.display).toBe('none');
        });

        it('should update link text when hiding', () => {
            action.execute('toggleRus', host);

            const link = host.querySelector('.toggleRus') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Показать русский перевод');
        });

        it('should show Russian translation when toggled back', () => {
            action.execute('toggleRus', host);
            action.execute('toggleRus', host);

            const rusEl = host.querySelector('.BibleRus') as HTMLElement;
            expect(rusEl.style.display).toBe('');

            const link = host.querySelector('.toggleRus') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Скрыть русский перевод');
        });

        it('should ensure Church Slavonic is visible when hiding Russian', () => {
            const cslEl = host.querySelector('.BibleCsl') as HTMLElement;
            cslEl.style.display = 'none';

            action.execute('toggleRus', host);

            expect(cslEl.style.display).toBe('');
        });
    });

    describe('toggleCsl', () => {
        beforeEach(() => {
            host.innerHTML = `
                <a class="toggleRus">Скрыть русский перевод</a>
                <a class="toggleCsl">Скрыть церковнославянский перевод</a>
                <div class="BibleRus">Russian text</div>
                <div class="BibleCsl">Church Slavonic text</div>
            `;
        });

        it('should hide Church Slavonic translation', () => {
            action.execute('toggleCsl', host);

            const cslEl = host.querySelector('.BibleCsl') as HTMLElement;
            expect(cslEl.style.display).toBe('none');
        });

        it('should update link text when hiding', () => {
            action.execute('toggleCsl', host);

            const link = host.querySelector('.toggleCsl') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Показать церковнославянский перевод');
        });

        it('should show Church Slavonic when toggled back', () => {
            action.execute('toggleCsl', host);
            action.execute('toggleCsl', host);

            const cslEl = host.querySelector('.BibleCsl') as HTMLElement;
            expect(cslEl.style.display).toBe('');

            const link = host.querySelector('.toggleCsl') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Скрыть церковнославянский перевод');
        });

        it('should ensure Russian is visible when hiding Church Slavonic', () => {
            const rusEl = host.querySelector('.BibleRus') as HTMLElement;
            rusEl.style.display = 'none';

            action.execute('toggleCsl', host);

            expect(rusEl.style.display).toBe('');
        });
    });
});
