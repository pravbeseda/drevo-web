import { WikiAction } from './wiki-action';
import { Injectable } from '@angular/core';

interface BibleToggleState {
    rusVisible: boolean;
    cslVisible: boolean;
}

@Injectable()
export class BibleToggleAction implements WikiAction {
    readonly name = 'BibleToggle';

    private readonly state: BibleToggleState = {
        rusVisible: true,
        cslVisible: true,
    };

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
            this.state.cslVisible = true;
        }

        this.state.rusVisible = !willBeHidden;
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
            this.state.rusVisible = true;
        }

        this.state.cslVisible = !willBeHidden;
        this.updateBibleLinks(host);
    }

    private updateBibleLinks(host: HTMLElement): void {
        const rusLinks = Array.from(host.querySelectorAll('.toggleRus')) as HTMLElement[];
        const cslLinks = Array.from(host.querySelectorAll('.toggleCsl')) as HTMLElement[];

        const rusText = this.state.rusVisible ? 'Скрыть русский перевод' : 'Показать русский перевод';
        const cslText = this.state.cslVisible
            ? 'Скрыть церковнославянский перевод'
            : 'Показать церковнославянский перевод';

        rusLinks.forEach(link => {
            link.textContent = rusText;
        });

        cslLinks.forEach(link => {
            link.textContent = cslText;
        });
    }
}
