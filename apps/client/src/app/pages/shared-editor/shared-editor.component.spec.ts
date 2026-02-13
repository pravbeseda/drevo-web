import { HttpHandler } from '@angular/common/http';
import { Spectator, createComponentFactory, mockProvider } from '@ngneat/spectator/jest';
import { SharedEditorComponent } from './shared-editor.component';

describe('SharedEditorComponent', () => {
    let spectator: Spectator<SharedEditorComponent>;
    const createComponent = createComponentFactory(SharedEditorComponent);

    it('should create', () => {
        spectator = createComponent({
            providers: [mockProvider(HttpHandler)],
        });

        expect(spectator.component).toBeTruthy();
    });
});
