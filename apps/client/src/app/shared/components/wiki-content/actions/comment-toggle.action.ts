import { WikiAction } from './wiki-action';
import { Injectable } from '@angular/core';

@Injectable()
export class CommentToggleAction implements WikiAction {
    readonly name = 'CommentToggle';

    canExecute(actionName: string): boolean {
        return actionName === 'toggleAll';
    }

    execute(_actionName: string, host: HTMLElement): void {
        const comments = host.querySelectorAll('.cmnt');
        const links = Array.from(host.querySelectorAll('.LinkComment')) as HTMLElement[];

        const isExpanded = links[0]?.textContent?.trim() === 'Свернуть';

        links.forEach(link => {
            link.textContent = isExpanded ? 'Развернуть' : 'Свернуть';
        });

        comments.forEach((comment: Element) => {
            (comment as HTMLElement).style.display = isExpanded ? 'none' : '';
        });
    }
}
