import { EditorView } from '@codemirror/view';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { WikiHighlighterService } from '../wiki-highlighter/wiki-highlighter.service';
import { EditorFactoryService } from './editor-factory.service';

describe('EditorFactoryService', () => {
    let spectator: SpectatorService<EditorFactoryService>;

    const createService = createServiceFactory({
        service: EditorFactoryService,
        providers: [WikiHighlighterService],
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('should outline the stray letters of a word that mixes alphabets', () => {
        const view = new EditorView({ state: spectator.service.createState('Это cвятой отец') });

        expect(view.dom.querySelector('[data-testid="mixed-script-letter"]')?.textContent).toBe('c');
        view.destroy();
    });
});
