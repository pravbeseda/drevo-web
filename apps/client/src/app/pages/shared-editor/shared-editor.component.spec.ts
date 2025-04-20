import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { SharedEditorComponent } from './shared-editor.component';

describe('SharedEditorComponent', () => {
    let spectator: Spectator<SharedEditorComponent>;
    const createComponent = createComponentFactory(SharedEditorComponent);

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });
});
