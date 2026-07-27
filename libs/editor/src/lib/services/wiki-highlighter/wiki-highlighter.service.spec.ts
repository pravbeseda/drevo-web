import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { linksUpdatedEffect } from '../../constants/editor-effects';
import { WikiHighlighterService } from './wiki-highlighter.service';

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

    // The viewport is virtualized, so only presence of the decoration is asserted here —
    // that is what distinguishes length-independent scanning from a capped match.
    it('should highlight a footnote far longer than any fixed scan window', () => {
        const view = getView(`[[${'а'.repeat(25000)}]]`);

        expect(view.dom.querySelector('.cm-footnote')).not.toBeNull();
    });

    it('should highlight a link far longer than any fixed scan window', () => {
        const view = getView(`((${'б'.repeat(3000)}))`);

        expect(view.dom.querySelector(pendingSelector)).not.toBeNull();
    });

    it('should highlight a long link with an alias', () => {
        const view = getView(`((${'в'.repeat(2500)}=алиас))`);

        expect(view.dom.querySelector(pendingSelector)).not.toBeNull();
    });

    // A quadratic scan of this shape costs ~215ms locally against ~6ms for a benign
    // document of the same size, so the bound separates the two by a wide margin.
    it('should scan a long run of closing parentheses without a quadratic stall', () => {
        const doc = `((a${')'.repeat(40000)}`;

        const started = performance.now();
        getView(doc);

        expect(performance.now() - started).toBeLessThan(80);
    });

    it('should not highlight a link spanning a newline', () => {
        const view = getView('((Имя\nФамилия))');

        expect(view.dom.querySelector(pendingSelector)).toBeNull();
    });

    it('should skip a tripled opening bracket and match from the inner pair', () => {
        const view = getView('(((Имя))');

        expect(view.dom.querySelector(pendingSelector)?.textContent).toBe('Имя');
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
                {
                    input: 'Ёлка',
                    normalized: 'ЕЛКА',
                    description: 'normalize "ё" to "е" (uppercase)',
                },
                {
                    input: 'ёлка',
                    normalized: 'ЕЛКА',
                    description: 'normalize "ё" to "е" (lowercase)',
                },
                {
                    input: 'Новый   год',
                    normalized: 'НОВЫЙ ГОД',
                    description: 'remove multiple spaces',
                },
                {
                    input: 'Новый\t\tгод',
                    normalized: 'НОВЫЙ ГОД',
                    description: 'remove tabs',
                },
                {
                    input: '  Ёлка   новогодняя  ',
                    normalized: 'ЕЛКА НОВОГОДНЯЯ',
                    description: 'combine ё + spaces normalization',
                },
            ])('should $description: "$input" -> "$normalized"', async ({ input, normalized }) => {
                const view = getView(`((${input}))`);

                await service.updateLinksState({ [normalized]: true });
                view.dispatch({
                    effects: linksUpdatedEffect.of(undefined),
                });

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

                await service.updateLinksState({ ЕЛКА: true });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });

                const existsElements = view.dom.querySelectorAll(existsSelector);
                expect(existsElements.length).toBe(2);
            });

            it('should lookup status by normalized key regardless of input variant', async () => {
                const view = getView('((Ёлка)) ((елка  )) ((ЕЛКА))');

                await service.updateLinksState({ ЕЛКА: true });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });

                const existsElements = view.dom.querySelectorAll(existsSelector);
                expect(existsElements.length).toBe(3);
                expect(existsElements[0]?.textContent).toBe('Ёлка');
                expect(existsElements[1]?.textContent).toBe('елка  ');
                expect(existsElements[2]?.textContent).toBe('ЕЛКА');
            });

            it('should handle non-normalized keys (backward compatibility)', async () => {
                const view = getView('((СТАРЫЙ_КЛЮЧ))');

                await service.updateLinksState({ СТАРЫЙ_КЛЮЧ: false });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });

                const missingElement = view.dom.querySelector(missingSelector);
                expect(missingElement).not.toBeNull();
                expect(missingElement?.textContent).toBe('СТАРЫЙ_КЛЮЧ');
            });

            it('should apply status to all Ё/Е variants in editor', async () => {
                const view = getView('((Ёлка)) и ((Елка))');

                await service.updateLinksState({ ЕЛКА: true });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });

                const existsElements = view.dom.querySelectorAll(existsSelector);
                expect(existsElements.length).toBe(2);
            });
        });
    });
});
