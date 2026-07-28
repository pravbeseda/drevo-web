import { HttpHandler } from '@angular/common/http';
import { Spectator, createComponentFactory, mockProvider } from '@ngneat/spectator/jest';
import { EMPTY } from 'rxjs';
import { LinksService } from '../../services/links/links.service';
import { IframeService } from './iframe.service';
import { SharedEditorComponent } from './shared-editor.component';

describe('SharedEditorComponent', () => {
    let spectator: Spectator<SharedEditorComponent>;
    const createComponent = createComponentFactory({
        component: SharedEditorComponent,
        // Replaces the component's own `providers`, so both scoped services need a stand-in.
        // The empty streams stand for a host that has not sent `loadContent` yet, which is
        // the state in which no editor is rendered and nothing may be sent out.
        componentProviders: [
            mockProvider(IframeService, { content$: EMPTY, insertTag$: EMPTY }),
            mockProvider(LinksService),
        ],
    });

    beforeEach(() => {
        spectator = createComponent({
            providers: [mockProvider(HttpHandler)],
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    // The ping is the only outbound message allowed before the host is known, so it goes
    // through the dedicated broadcast rather than the guarded `sendMessage`.
    it('should announce readiness through the broadcast channel', () => {
        const iframeService = spectator.inject(IframeService, true);

        expect(iframeService.announceReady).toHaveBeenCalled();
        expect(iframeService.sendMessage).not.toHaveBeenCalled();
    });
});
