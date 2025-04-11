import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { EditorComponent } from './editor.component';
import { Article } from '@drevo-web/shared';

const mockArticle: Article = {} as Article;

describe('EditorComponent', () => {
    let spectator: Spectator<EditorComponent>;
    const createComponent = createComponentFactory(EditorComponent);

    beforeEach(() => {
        spectator = createComponent({ props: { article: mockArticle } });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });
});
