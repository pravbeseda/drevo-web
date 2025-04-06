import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { WikiHighlighterService } from './wiki-highlighter.service';
import { LinksStateService } from '../links-state/links-state.service';

const pendingSelector = '.cm-link-pending';
const existsSelector = '.cm-link-exists';
const missingSelector = '.cm-link-missing';

describe('WikiHighlighterService', () => {
    let spectator: SpectatorService<WikiHighlighterService>;
    let linksStateService: jest.Mocked<LinksStateService>;

    const sampleText = '[[Пример сноски]] и ((ссылка))';

    const createService = createServiceFactory({
        service: WikiHighlighterService,
        mocks: [LinksStateService],
    });

    beforeEach(() => {
        spectator = createService();
        linksStateService = spectator.inject(LinksStateService) as jest.Mocked<LinksStateService>;
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
        jest.spyOn(linksStateService, 'getLinkStatus').mockReturnValue('pending');
        const view = getView(sampleText);

        const linkElement = view.dom.querySelector(pendingSelector);
        expect(linkElement).not.toBeNull();
        expect(linkElement?.textContent).toBe('ссылка');
        expect(linksStateService.getLinkStatus).toHaveBeenCalledWith('ссылка');
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
        jest.spyOn(linksStateService, 'getLinkStatus').mockReturnValue('pending');
        const view = getView(sample);

        const linkElement = view.dom.querySelector(pendingSelector);
        expect(linkElement).not.toBeNull();
        expect(linkElement?.textContent).toBe(result);
    });

    it('should update link statuses based on API response', async () => {
        linksStateService.getLinkStatus.mockReturnValue(undefined);
        linksStateService.fetchLinkStatuses.mockResolvedValue();

        getView('[[Пример сноски]] и ((ссылка)) и ((неизвестная))');

        await linksStateService.fetchLinkStatuses.mock.results[0].value;

        expect(linksStateService.fetchLinkStatuses).toHaveBeenCalledWith(['ссылка', 'неизвестная']);
    });

    it('should show links as exists and missing', async () => {
        jest.spyOn(linksStateService, 'getLinkStatus').mockImplementation((link: string) =>
            link === 'ссылка' ? true : link === 'неизвестная' ? false : 'pending'
        );

        linksStateService.fetchLinkStatuses.mockResolvedValue();

        const view = getView('[[Пример сноски]] и ((ссылка)) и ((неизвестная))');

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
});
