import { WikiClickHandler } from './wiki-click-handler';
import { BibleToggleAction } from '../actions/bible-toggle.action';
import { CommentToggleAction } from '../actions/comment-toggle.action';
import { GroupToggleAction } from '../actions/group-toggle.action';
import { MapStubAction } from '../actions/map-stub.action';
import { WikiAction } from '../actions/wiki-action';
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@drevo-web/core';

@Injectable()
export class LegacyActionClickHandler implements WikiClickHandler {
    private readonly logger = inject(LoggerService).withContext('LegacyActionClickHandler');

    private readonly actions: readonly WikiAction[] = [
        inject(BibleToggleAction),
        inject(CommentToggleAction),
        inject(GroupToggleAction),
        inject(MapStubAction),
    ];

    handleClick(event: MouseEvent, target: HTMLElement, host: HTMLElement): boolean {
        const dataOnclickValue = this.findDataOnclick(target, host);
        if (dataOnclickValue) {
            event.preventDefault();
            this.dispatchAction(dataOnclickValue, host);
            return true;
        }

        const anchor = target.closest('a');
        const href = anchor?.getAttribute('href');
        if (href && this.isJavaScriptProtocol(href)) {
            event.preventDefault();
            this.dispatchAction(href, host);
            return true;
        }

        return false;
    }

    private findDataOnclick(target: HTMLElement, host: HTMLElement): string | undefined {
        let element: HTMLElement | undefined = target;
        while (element && element !== host) {
            const dataOnclick = element.getAttribute('data-onclick');
            if (dataOnclick && this.isJavaScriptProtocol(dataOnclick)) {
                return dataOnclick;
            }
            element = element.parentElement ?? undefined;
        }
        return undefined;
    }

    private dispatchAction(value: string, host: HTMLElement): void {
        const parsed = this.parseJavaScriptAction(value);
        if (!parsed) {
            this.logger.warn('Invalid javascript action format', { value });
            return;
        }

        const { action, param } = parsed;
        const handler = this.actions.find(a => a.canExecute(action));

        if (handler) {
            handler.execute(action, host, param);
        } else {
            this.logger.warn('Unknown javascript action', { action, value });
        }
    }

    private parseJavaScriptAction(value: string): { action: string; param?: string } | undefined {
        const trimmed = value.trim();

        const matchWithParam = /^javascript:\s*(?:\w+=)?([a-zA-Z]+)\('([a-zA-Z0-9_-]+)'\)(?:;.*)?$/i.exec(trimmed);
        if (matchWithParam) {
            return { action: matchWithParam[1], param: matchWithParam[2] };
        }

        const matchSimple = /^javascript:\s*(?:\w+=)?([a-zA-Z]+)(?:\(\))?(?:;.*)?$/i.exec(trimmed);
        if (matchSimple) {
            return { action: matchSimple[1] };
        }

        return undefined;
    }

    private isJavaScriptProtocol(value: string): boolean {
        const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
        return (
            normalized.startsWith('javascript:') || normalized.startsWith('data:') || normalized.startsWith('vbscript:')
        );
    }
}
