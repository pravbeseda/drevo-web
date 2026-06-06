import { BibleToggleAction } from './bible-toggle.action';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

describe('BibleToggleAction', () => {
    let spectator: SpectatorService<BibleToggleAction>;
    let host: HTMLElement;

    const createService = createServiceFactory({
        service: BibleToggleAction,
    });

    beforeEach(() => {
        spectator = createService();
        host = document.createElement('div');
    });

    it('should have name', () => {
        expect(spectator.service.name).toBe('BibleToggle');
    });

    describe('canExecute', () => {
        it('should match toggleRus', () => {
            expect(spectator.service.canExecute('toggleRus')).toBe(true);
        });

        it('should match toggleCsl', () => {
            expect(spectator.service.canExecute('toggleCsl')).toBe(true);
        });

        it('should not match other actions', () => {
            expect(spectator.service.canExecute('toggleAll')).toBe(false);
            expect(spectator.service.canExecute('toggleGroup')).toBe(false);
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
            spectator.service.execute('toggleRus', host);

            const rusEl = host.querySelector('.BibleRus') as HTMLElement;
            expect(rusEl.style.display).toBe('none');
        });

        it('should update link text when hiding', () => {
            spectator.service.execute('toggleRus', host);

            const link = host.querySelector('.toggleRus') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Показать русский перевод');
        });

        it('should show Russian translation when toggled back', () => {
            spectator.service.execute('toggleRus', host);
            spectator.service.execute('toggleRus', host);

            const rusEl = host.querySelector('.BibleRus') as HTMLElement;
            expect(rusEl.style.display).toBe('');

            const link = host.querySelector('.toggleRus') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Скрыть русский перевод');
        });

        it('should ensure Church Slavonic is visible when hiding Russian', () => {
            const cslEl = host.querySelector('.BibleCsl') as HTMLElement;
            cslEl.style.display = 'none';

            spectator.service.execute('toggleRus', host);

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
            spectator.service.execute('toggleCsl', host);

            const cslEl = host.querySelector('.BibleCsl') as HTMLElement;
            expect(cslEl.style.display).toBe('none');
        });

        it('should update link text when hiding', () => {
            spectator.service.execute('toggleCsl', host);

            const link = host.querySelector('.toggleCsl') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Показать церковнославянский перевод');
        });

        it('should show Church Slavonic when toggled back', () => {
            spectator.service.execute('toggleCsl', host);
            spectator.service.execute('toggleCsl', host);

            const cslEl = host.querySelector('.BibleCsl') as HTMLElement;
            expect(cslEl.style.display).toBe('');

            const link = host.querySelector('.toggleCsl') as HTMLElement;
            expect(link.textContent?.trim()).toBe('Скрыть церковнославянский перевод');
        });

        it('should ensure Russian is visible when hiding Church Slavonic', () => {
            const rusEl = host.querySelector('.BibleRus') as HTMLElement;
            rusEl.style.display = 'none';

            spectator.service.execute('toggleCsl', host);

            expect(rusEl.style.display).toBe('');
        });
    });
});
