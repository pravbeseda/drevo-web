import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { EditorComponent } from './editor.component';

describe('EditorComponent', () => {
    let spectator: Spectator<EditorComponent>;
    const createComponent = createComponentFactory(EditorComponent);

    beforeEach(() => {
        spectator = createComponent({ props: { content: '' } });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });
});
