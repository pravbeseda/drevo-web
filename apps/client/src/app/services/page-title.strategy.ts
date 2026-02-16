import { inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LoggerService } from '@drevo-web/core';

const DEFAULT_TITLE = 'Древо';
const TITLE_SUFFIX = ' - Древо';

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);
    private readonly logger = inject(LoggerService).withContext('PageTitleStrategy');
    private readonly _pageTitle = signal(DEFAULT_TITLE);
    readonly pageTitle = this._pageTitle.asReadonly();

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const title = this.buildTitle(snapshot);

        if (title) {
            this._pageTitle.set(title);
            this.title.setTitle(`${title}${TITLE_SUFFIX}`);
        } else {
            this._pageTitle.set(DEFAULT_TITLE);
            this.title.setTitle(DEFAULT_TITLE);
        }

        this.logger.debug('Title updated', { title: title ?? DEFAULT_TITLE });
    }
}
