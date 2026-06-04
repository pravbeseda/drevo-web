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
            this.toggleRus(host);
        } else {
            this.toggleCsl(host);
        }
    }

    private toggleRus(host: HTMLElement): void {
        const rusElements = Array.from(host.querySelectorAll('.BibleRus')) as HTMLElement[];
        const cslElements = Array.from(host.querySelectorAll('.BibleCsl')) as HTMLElement[];

        const willBeHidden = rusElements[0]?.style.display !== 'none';
        rusElements.forEach(el => {
            el.style.display = willBeHidden ? 'none' : '';
        });

        if (willBeHidden) {
            cslElements.forEach(el => {
                el.style.display = '';
            });
        }

        this.updateBibleLinks(host);
    }

    private toggleCsl(host: HTMLElement): void {
        const cslElements = Array.from(host.querySelectorAll('.BibleCsl')) as HTMLElement[];
        const rusElements = Array.from(host.querySelectorAll('.BibleRus')) as HTMLElement[];

        const willBeHidden = cslElements[0]?.style.display !== 'none';
        cslElements.forEach(el => {
            el.style.display = willBeHidden ? 'none' : '';
        });

        if (willBeHidden) {
            rusElements.forEach(el => {
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
