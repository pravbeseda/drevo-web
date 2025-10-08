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

    function getView(text: string) {
        const state = EditorState.create({
            doc: text,
            extensions: [spectator.service.wikiHighlighter],
        });
        return new EditorView({ state });
    }

    describe('Link Normalization', () => {
        describe('normalizeLinkText', () => {
            it('should normalize "ё" to "е"', () => {
                const service = spectator.service;
                expect(service['normalizeLinkText']('Ёлка')).toBe('ЕЛКА');
                expect(service['normalizeLinkText']('ёлка')).toBe('ЕЛКА');
            });

            it('should remove multiple spaces', () => {
                const service = spectator.service;
                expect(service['normalizeLinkText']('Новый   год')).toBe('НОВЫЙ ГОД');
                expect(service['normalizeLinkText']('Новый\t\tгод')).toBe('НОВЫЙ ГОД');
            });

            it('should combine ё + spaces normalization', () => {
                const service = spectator.service;
                expect(service['normalizeLinkText']('  Ёлка   новогодняя  ')).toBe('ЕЛКА НОВОГОДНЯЯ');
            });
        });

        describe('requestLinksStatus', () => {
            it('should send one request for ЁЛКА and ЕЛКА', () => {
                const service = spectator.service;
                const spy = jest.spyOn(service['updateLinksSubject'], 'next');
                
                service['requestLinksStatus'](['Ёлка', 'Елка', 'ёлка']);
                
                expect(spy).toHaveBeenCalledWith(['ЕЛКА']);
                expect(spy).toHaveBeenCalledTimes(1);
            });

            it('should deduplicate multiple variants to single normalized key', () => {
                const service = spectator.service;
                const spy = jest.spyOn(service['updateLinksSubject'], 'next');
                
                service['requestLinksStatus'](['Ёлка', '  ЕЛКА  ', 'ёлка', 'Елка']);
                
                expect(spy).toHaveBeenCalledWith(['ЕЛКА']);
                expect(spy).toHaveBeenCalledTimes(1);
            });

            it('should not emit for empty array', () => {
                const service = spectator.service;
                const spy = jest.spyOn(service['updateLinksSubject'], 'next');
                
                service['requestLinksStatus']([]);
                
                expect(spy).not.toHaveBeenCalled();
            });
        });

        describe('updateLinksState', () => {
            it('should store status under normalized key', async () => {
                const service = spectator.service;
                
                // Setup mapping
                service['requestLinksStatus'](['Ёлка', 'Елка']);
                
                // Apply status
                await service.updateLinksState({ 'ЕЛКА': true });
                
                // Verify normalized key has status
                expect(service['linksState']['ЕЛКА']).toBe(true);
            });

            it('should lookup status by normalized key regardless of input variant', async () => {
                const service = spectator.service;
                
                // Setup: store status for normalized key
                service['linksState'] = { 'ЕЛКА': true };
                
                // Verify different variants resolve to same normalized key
                const normalized1 = service['normalizeLinkText']('Ёлка');
                const normalized2 = service['normalizeLinkText']('елка  ');
                const normalized3 = service['normalizeLinkText']('ЕЛКА');
                
                expect(normalized1).toBe('ЕЛКА');
                expect(normalized2).toBe('ЕЛКА');
                expect(normalized3).toBe('ЕЛКА');
                
                // All variants find the same status
                expect(service['linksState'][normalized1]).toBe(true);
                expect(service['linksState'][normalized2]).toBe(true);
                expect(service['linksState'][normalized3]).toBe(true);
            });

            it('should handle non-normalized keys (backward compatibility)', async () => {
                const service = spectator.service;
                
                // No mapping built
                await service.updateLinksState({ 'СТАРЫЙ_КЛЮЧ': false });
                
                // Should still work
                expect(service['linksState']['СТАРЫЙ_КЛЮЧ']).toBe(false);
            });
        });

        describe('edge cases', () => {
            it('should handle empty strings', () => {
                const service = spectator.service;
                expect(service['normalizeLinkText']('   ')).toBe('');
            });

            it('should handle only ё characters', () => {
                const service = spectator.service;
                expect(service['normalizeLinkText']('ёёё')).toBe('ЕЕЕ');
            });

            it('should handle null safely', () => {
                const service = spectator.service;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect(() => service['normalizeLinkText'](null as any)).not.toThrow();
            });
        });

        describe('integration tests', () => {
            it('should deduplicate Ё/Е variants in editor', async () => {
                const service = spectator.service;
                const spy = jest.spyOn(service['updateLinksSubject'], 'next');
                
                getView('((Ёлка)) и ((Елка)) и ((ёлка))');

                // Wait for initial processing
                await new Promise(resolve => setTimeout(resolve, 0));

                // Should only emit one normalized link
                expect(spy).toHaveBeenCalledWith(['ЕЛКА']);
                expect(spy).toHaveBeenCalledTimes(1);
            });

            it('should apply status to all Ё/Е variants in editor', async () => {
                const view = getView('((Ёлка)) и ((Елка))');
                const service = spectator.service;

                // Apply status for normalized key
                await service.updateLinksState({ 'ЕЛКА': true });
                view.dispatch({ effects: linksUpdatedEffect.of(undefined) });

                // Both variants should show as exists
                const existsElements = view.dom.querySelectorAll(existsSelector);
                expect(existsElements.length).toBe(2);
            });

            it('should deduplicate space variants in editor', async () => {
                const service = spectator.service;
                const spy = jest.spyOn(service['updateLinksSubject'], 'next');
                
                getView('((Новый  год)) и ((Новый год))');

                await new Promise(resolve => setTimeout(resolve, 0));

                expect(spy).toHaveBeenCalledWith(['НОВЫЙ ГОД']);
                expect(spy).toHaveBeenCalledTimes(1);
            });
        });
    });
});
