import { WikiAction } from './wiki-action';
import { Injectable } from '@angular/core';

@Injectable()
export class BibleToggleAction implements WikiAction {
    readonly name = 'BibleToggle';

    canExecute(actionName: string): boolean {
        return actionName === 'toggleRus' || actionName === 'toggleCsl';
    }

    execute(actionName: string, host: HTMLElement): void {
        if (actionName === 'toggleRus') {
            this.toggleTranslation(host, 'BibleRus', 'BibleCsl');
        } else {
            this.toggleTranslation(host, 'BibleCsl', 'BibleRus');
        }
    }

    private toggleTranslation(host: HTMLElement, primaryClass: string, otherClass: string): void {
        const primaryElements = Array.from(host.querySelectorAll(`.${primaryClass}`)) as HTMLElement[];
        const otherElements = Array.from(host.querySelectorAll(`.${otherClass}`)) as HTMLElement[];

        const willBeHidden = primaryElements[0]?.style.display !== 'none';
        primaryElements.forEach(el => {
            el.style.display = willBeHidden ? 'none' : '';
        });

        if (willBeHidden) {
            otherElements.forEach(el => {
                el.style.display = '';
            });
        }

        this.updateBibleLinks(host);
    }

    private updateBibleLinks(host: HTMLElement): void {
        const rusLinks = Array.from(host.querySelectorAll('.toggleRus')) as HTMLElement[];
        const cslLinks = Array.from(host.querySelectorAll('.toggleCsl')) as HTMLElement[];

        const rusVisible = (host.querySelector('.BibleRus') as HTMLElement)?.style.display !== 'none';
        const cslVisible = (host.querySelector('.BibleCsl') as HTMLElement)?.style.display !== 'none';

        const rusText = rusVisible ? 'Скрыть русский перевод' : 'Показать русский перевод';
        const cslText = cslVisible ? 'Скрыть церковнославянский перевод' : 'Показать церковнославянский перевод';

        rusLinks.forEach(link => {
            link.textContent = rusText;
        });

        cslLinks.forEach(link => {
            link.textContent = cslText;
        });
    }
}
