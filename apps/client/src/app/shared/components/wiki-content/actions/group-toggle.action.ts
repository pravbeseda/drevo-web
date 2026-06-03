import { WikiAction } from './wiki-action';
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@drevo-web/core';

@Injectable()
export class GroupToggleAction implements WikiAction {
    readonly name = 'GroupToggle';

    private readonly logger = inject(LoggerService).withContext('GroupToggleAction');

    canExecute(actionName: string): boolean {
        return actionName === 'toggleGroup';
    }

    execute(_actionName: string, host: HTMLElement, param?: string): void {
        if (!param) {
            this.logger.warn('toggleGroup requires a class name parameter');
            return;
        }

        const elements = Array.from(host.querySelectorAll(`.${CSS.escape(param)}`)) as HTMLElement[];

        elements.forEach(el => {
            el.style.display = el.style.display === 'none' ? '' : 'none';
        });
    }
}
