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
    let service: WikiHighlighterService;

    const createService = createServiceFactory({
        service: WikiHighlighterService,
    });

    beforeEach(() => {
        spectator = createService();
        service = spectator.service;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should highlight footnotes', () => {
        const view = getView('[[Пример сноски]] и ((ссылка))');
        const footnoteElement = view.dom.querySelector('.cm-footnote');

        expect(footnoteElement).not.toBeNull();
        expect(footnoteElement?.textContent).toBe('[[Пример сноски]]');
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
    ])('should highlight links as pending by default for "$sample"', ({ sample, result }) => {
        const view = getView(sample);

        const linkElement = view.dom.querySelector(pendingSelector);
        expect(linkElement).not.toBeNull();
        expect(linkElement?.textContent).toBe(result);
    });

    it('should show links as exists and missing', async () => {
        const view = getView('[[Пример сноски]] и ((ссылка)) и ((неизвестная))');
        service.updateLinksState({
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

    function getView(text: string) {
        const state = EditorState.create({
            doc: text,
            extensions: [service.wikiHighlighter],
        });
        return new EditorView({ state });
    }

    describe('Link Normalization', () => {
        describe('link normalization', () => {
            it.each([
                { input: 'Ёлка', normalized: 'ЕЛКА', description: 'normalize "ё" to "е" (uppercase)' },
                { input: 'ёлка', normalized: 'ЕЛКА', description: 'normalize "ё" to "е" (lowercase)' },
                { input: 'Новый   год', normalized: 'НОВЫЙ ГОД', description: 'remove multiple spaces' },
                { input: 'Новый\t\tгод', normalized: 'НОВЫЙ ГОД', description: 'remove tabs' },
                { input: '  Ёлка   новогодняя  ', normalized: 'ЕЛКА НОВОГОДНЯЯ', description: 'combine ё + spaces normalization' },
            ])('should $description: "$input" -> "$normalized"', async ({ input, normalized }) => {
                const view = getView(`((${input}))`);
                
                await service.updateLinksState({ [normalized]: true });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });

                const existsElement = view.dom.querySelector(existsSelector);
                expect(existsElement).not.toBeNull();
                expect(existsElement?.textContent).toBe(input);
            });

            it('should handle empty strings without errors', async () => {
                getView('((   ))');
                
                await expect(service.updateLinksState({ '': true })).resolves.not.toThrow();
            });
        });

        describe('links deduplication', () => {
            it.each([
                {
                    description: 'send one request for ЁЛКА and ЕЛКА',
                    text: '((Ёлка)) ((Елка)) ((ёлка))',
                    expected: ['ЕЛКА'],
                },
                {
                    description: 'deduplicate multiple variants to single normalized key',
                    text: '((Ёлка)) ((  ЕЛКА  )) ((ёлка)) ((Елка))',
                    expected: ['ЕЛКА'],
                },
            ])('should $description', ({ text, expected }) => {
                const spy = jest.spyOn(service.updateLinks$, 'subscribe');
                let emittedValue: string[] | undefined;
                
                service.updateLinks$.subscribe(value => {
                    emittedValue = value;
                });
                
                getView(text);
                
                expect(spy).toHaveBeenCalled();
                expect(emittedValue).toEqual(expected);
            });

            it('should not emit for editor without links', () => {
                const spy = jest.fn();
                service.updateLinks$.subscribe(spy);
                
                getView('просто текст без ссылок');
                
                expect(spy).not.toHaveBeenCalled();
            });
        });

        describe('updateLinksState', () => {
            it('should update link status to "exists" when normalized key matches', async () => {
                const view = getView('((Ёлка)) ((Елка))');
                
                await service.updateLinksState({ 'ЕЛКА': true });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });
                
                const existsElements = view.dom.querySelectorAll(existsSelector);
                expect(existsElements.length).toBe(2);
            });

            it('should lookup status by normalized key regardless of input variant', async () => {
                const view = getView('((Ёлка)) ((елка  )) ((ЕЛКА))');
                
                await service.updateLinksState({ 'ЕЛКА': true });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });

                const existsElements = view.dom.querySelectorAll(existsSelector);
                expect(existsElements.length).toBe(3);
                expect(existsElements[0]?.textContent).toBe('Ёлка');
                expect(existsElements[1]?.textContent).toBe('елка  ');
                expect(existsElements[2]?.textContent).toBe('ЕЛКА');
            });

            it('should handle non-normalized keys (backward compatibility)', async () => {
                const view = getView('((СТАРЫЙ_КЛЮЧ))');
                
                await service.updateLinksState({ 'СТАРЫЙ_КЛЮЧ': false });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });
                
                const missingElement = view.dom.querySelector(missingSelector);
                expect(missingElement).not.toBeNull();
                expect(missingElement?.textContent).toBe('СТАРЫЙ_КЛЮЧ');
            });

            it('should apply status to all Ё/Е variants in editor', async () => {
                const view = getView('((Ёлка)) и ((Елка))');

                await service.updateLinksState({ 'ЕЛКА': true });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });

                const existsElements = view.dom.querySelectorAll(existsSelector);
                expect(existsElements.length).toBe(2);
            });
        });
    });
});
