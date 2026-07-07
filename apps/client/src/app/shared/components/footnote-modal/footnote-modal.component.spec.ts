import { PictureLightboxService } from '../../../services/pictures/picture-lightbox.service';
import { FootnoteModalComponent } from './footnote-modal.component';
import { Router } from '@angular/router';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { NotificationService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { MODAL_DATA, ModalData } from '@drevo-web/ui';
import { EMPTY } from 'rxjs';

describe('FootnoteModalComponent', () => {
    let spectator: Spectator<FootnoteModalComponent>;
    const close = jest.fn();

    const modalData: ModalData<{ label: string; html: string }> = {
        data: { label: '[1]', html: '<p>Footnote text</p>' },
        close,
    };

    const createComponent = createComponentFactory({
        component: FootnoteModalComponent,
        providers: [
            mockLoggerProvider(),
            mockProvider(PictureLightboxService),
            mockProvider(NotificationService),
            mockProvider(Router, { events: EMPTY, url: '/articles/1' }),
            { provide: MODAL_DATA, useValue: modalData },
        ],
    });

    beforeEach(() => {
        close.mockClear();
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render the footnote label', () => {
        expect(spectator.query('[data-testid="footnote-modal-label"]')).toHaveText('[1]');
    });

    it('should render the footnote html via wiki content', () => {
        expect(spectator.query('app-wiki-content')?.textContent).toContain('Footnote text');
    });

    it('should close the modal via modal data', () => {
        spectator.component.close();

        expect(close).toHaveBeenCalled();
    });
});
