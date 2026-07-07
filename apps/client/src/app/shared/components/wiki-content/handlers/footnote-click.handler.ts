import { inPageAnchorId } from './in-page-anchor';
import { isModifiedClick } from './modified-click';
import { WikiClickHandler } from './wiki-click-handler';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import { ModalService } from '@drevo-web/ui';

const FOOTNOTE_MARKER_CLASS = 'link-note';
const FOOTNOTE_BACKLINK_SELECTOR = '.link-source';

@Injectable()
export class FootnoteClickHandler implements WikiClickHandler {
    private readonly document = inject(DOCUMENT);
    private readonly modalService = inject(ModalService);
    private readonly logger = inject(LoggerService).withContext('FootnoteClickHandler');

    handleClick(event: MouseEvent, target: HTMLElement): boolean {
        if (isModifiedClick(event)) {
            return false;
        }

        const anchor = target.closest('a');
        if (!anchor || !anchor.classList.contains(FOOTNOTE_MARKER_CLASS)) {
            return false;
        }

        const href = anchor.getAttribute('href');
        const footnoteId = href ? inPageAnchorId(href, this.document.location) : undefined;
        const footnote = footnoteId ? this.document.getElementById(footnoteId) : undefined;
        if (!footnote) {
            return false;
        }

        event.preventDefault();

        const label = anchor.textContent?.trim() ?? '';
        this.logger.info('Open footnote', { footnoteId, label });

        this.modalService.open(
            () => import('../../footnote-modal/footnote-modal.component').then(m => m.FootnoteModalComponent),
            {
                position: 'bottom',
                border: false,
                data: { label, html: this.extractContent(footnote) },
            },
        );

        return true;
    }

    /**
     * Returns the footnote body HTML with the back-reference link (`.link-source`)
     * removed: inside the modal the back-link is redundant and would scroll the
     * article behind the backdrop instead of doing anything useful.
     */
    private extractContent(footnote: HTMLElement): string {
        const clone = footnote.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(FOOTNOTE_BACKLINK_SELECTOR).forEach(link => link.remove());
        return clone.innerHTML;
    }
}
