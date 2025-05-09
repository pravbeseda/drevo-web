import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { WikiHighlighterService } from './wiki-highlighter.service';
import { linksUpdatedEffect } from '../../constants/editor-effects';

const pendingSelector = '.cm-link-pending';
const existsSelector = '.cm-link-exists';
const missingSelector = '.cm-link-missing';

describe('WikiHighlighterService', () => {
    let spectator: SpectatorService<WikiHighlighterService>;

    const sampleText = '[[Пример сноски]] и ((ссылка))';

    const createService = createServiceFactory({
        service: WikiHighlighterService,
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should highlight footnotes', () => {
        const view = getView(sampleText);
        const footnoteElement = view.dom.querySelector('.cm-footnote');

        expect(footnoteElement).not.toBeNull();
        expect(footnoteElement?.textContent).toBe('[[Пример сноски]]');
    });

    it('should highlight links as pending by default', () => {
        const view = getView(sampleText);

        const linkElement = view.dom.querySelector(pendingSelector);
        expect(linkElement).not.toBeNull();
        expect(linkElement?.textContent).toBe('ссылка');
    });

    it.each([
        {
            sample: '[[Пример сноски]] и ((ссылка))',
            result: 'ссылка',
        },
        {
            sample: 'текст ((Имя (Фамилия))) текст',
            result: 'Имя (Фамилия)',
        },
        {
            sample: 'текст ((Имя (Фамилия)))) текст',
            result: 'Имя (Фамилия)',
        },
        {
            sample: 'текст ((Имя (Фамилия)=Другое имя (Фамилия)))) текст',
            result: 'Имя (Фамилия)',
        },
    ])('should highlight links for "$sample"', ({ sample, result }) => {
        const view = getView(sample);

        const linkElement = view.dom.querySelector(pendingSelector);
        expect(linkElement).not.toBeNull();
        expect(linkElement?.textContent).toBe(result);
    });

    it('should update link statuses based on API response', async () => {
        getView('[[Пример сноски]] и ((ссылка)) и ((неизвестная))');
    });

    it('should show links as exists and missing', async () => {
        const view = getView('[[Пример сноски]] и ((ссылка)) и ((неизвестная))');
        spectator.service.updateLinksState({
            ['ССЫЛКА']: true,
            ['НЕИЗВЕСТНАЯ']: false,
        });
        view.dispatch({ effects: linksUpdatedEffect.of(undefined) });

        const existsElement = view.dom.querySelector(existsSelector);
        const missingElement = view.dom.querySelector(missingSelector);

        expect(existsElement).not.toBeNull();
        expect(existsElement?.textContent).toBe('ссылка');

        expect(missingElement).not.toBeNull();
        expect(missingElement?.textContent).toBe('неизвестная');
    });

    it('should highlight URL links', () => {
        const view = getView('Текст с https://example.com ссылкой');
        
        const urlElement = view.dom.querySelector('.cm-url');
        expect(urlElement).not.toBeNull();
        expect(urlElement?.textContent).toBe('https://example.com');
    });

    it('should highlight multiple URLs in text', () => {
        const view = getView('Ссылки: https://example.com и http://test.org/path');
        
        const urlElements = view.dom.querySelectorAll('.cm-url');
        expect(urlElements.length).toBe(2);
        expect(urlElements[0]?.textContent).toBe('https://example.com');
        expect(urlElements[1]?.textContent).toBe('http://test.org/path');
    });

    it('should preserve URL highlighting when typing after URL', () => {
        const initialText = 'Текст с https://example.com';
        const view = getView(initialText);
        
        // Проверяем начальную подсветку
        let urlElement = view.dom.querySelector('.cm-url');
        expect(urlElement).not.toBeNull();
        expect(urlElement?.textContent).toBe('https://example.com');
        
        // Симулируем ввод текста после URL
        view.dispatch({
            changes: { from: initialText.length, to: initialText.length, insert: ' дополнительный текст' }
        });
        
        // Проверяем, что URL все еще подсвечен
        urlElement = view.dom.querySelector('.cm-url');
        expect(urlElement).not.toBeNull();
        expect(urlElement?.textContent).toBe('https://example.com');
    });

    it('should properly highlight URLs after pressing Enter', () => {
        const initialText = 'Текст с https://example.com';
        const view = getView(initialText);
        
        // Симулируем нажатие Enter после URL
        view.dispatch({
            changes: { from: initialText.length, to: initialText.length, insert: '\nНовая строка с http://test.org' }
        });
        
        // Проверяем, что обе ссылки подсвечены
        const urlElements = view.dom.querySelectorAll('.cm-url');
        expect(urlElements.length).toBe(2);
        expect(urlElements[0]?.textContent).toBe('https://example.com');
        expect(urlElements[1]?.textContent).toBe('http://test.org');
    });

    function getView(text: string) {
        const state = EditorState.create({
            doc: text,
            extensions: [spectator.service.wikiHighlighter],
        });
        return new EditorView({ state });
    }
});
