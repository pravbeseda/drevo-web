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
        describe('normalizeLinkText', () => {
            it.each([
                { input: 'Ёлка', expected: 'ЕЛКА', description: 'normalize "ё" to "е" (uppercase)' },
                { input: 'ёлка', expected: 'ЕЛКА', description: 'normalize "ё" to "е" (lowercase)' },
                { input: 'Новый   год', expected: 'НОВЫЙ ГОД', description: 'remove multiple spaces' },
                { input: 'Новый\t\tгод', expected: 'НОВЫЙ ГОД', description: 'remove tabs' },
                { input: '  Ёлка   новогодняя  ', expected: 'ЕЛКА НОВОГОДНЯЯ', description: 'combine ё + spaces normalization' },
                { input: '   ', expected: '', description: 'handle empty strings' },
                { input: 'ёёё', expected: 'ЕЕЕ', description: 'handle only ё characters' },
            ])('should $description: "$input" -> "$expected"', ({ input, expected }) => {
                expect(service['normalizeLinkText'](input)).toBe(expected);
            });

            it('should handle null safely', () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect(() => service['normalizeLinkText'](null as any)).not.toThrow();
            });
        });

        describe('requestLinksStatus', () => {
            it.each([
                {
                    description: 'send one request for ЁЛКА and ЕЛКА',
                    input: ['Ёлка', 'Елка', 'ёлка'],
                    expected: ['ЕЛКА'],
                },
                {
                    description: 'deduplicate multiple variants to single normalized key',
                    input: ['Ёлка', '  ЕЛКА  ', 'ёлка', 'Елка'],
                    expected: ['ЕЛКА'],
                },
            ])('should $description', ({ input, expected }) => {
                const spy = jest.spyOn(service['updateLinksSubject'], 'next');
                
                service['requestLinksStatus'](input);
                
                expect(spy).toHaveBeenCalledWith(expected);
                expect(spy).toHaveBeenCalledTimes(1);
            });

            it('should not emit for empty array', () => {
                const spy = jest.spyOn(service['updateLinksSubject'], 'next');
                
                service['requestLinksStatus']([]);
                
                expect(spy).not.toHaveBeenCalled();
            });
        });

        describe('updateLinksState', () => {
            it('should store status under normalized key', async () => {
                service['requestLinksStatus'](['Ёлка', 'Елка']);
                
                await service.updateLinksState({ 'ЕЛКА': true });
                
                expect(service['linksState']['ЕЛКА']).toBe(true);
            });

            it('should lookup status by normalized key regardless of input variant', async () => {
                service['linksState'] = { 'ЕЛКА': true };
                
                expect(service['linksState'][service['normalizeLinkText']('Ёлка')]).toBe(true);
                expect(service['linksState'][service['normalizeLinkText']('елка  ')]).toBe(true);
                expect(service['linksState'][service['normalizeLinkText']('ЕЛКА')]).toBe(true);
            });

            it('should handle non-normalized keys (backward compatibility)', async () => {
                await service.updateLinksState({ 'СТАРЫЙ_КЛЮЧ': false });
                
                expect(service['linksState']['СТАРЫЙ_КЛЮЧ']).toBe(false);
            });
        });

        describe('integration tests', () => {
            it.each([
                {
                    description: 'deduplicate Ё/Е variants in editor',
                    text: '((Ёлка)) и ((Елка)) и ((ёлка))',
                    expected: ['ЕЛКА'],
                },
                {
                    description: 'deduplicate space variants in editor',
                    text: '((Новый  год)) и ((Новый год))',
                    expected: ['НОВЫЙ ГОД'],
                },
            ])('should $description', async ({ text, expected }) => {
                const spy = jest.spyOn(service['updateLinksSubject'], 'next');
                
                getView(text);

                expect(spy).toHaveBeenCalledWith(expected);
                expect(spy).toHaveBeenCalledTimes(1);
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
