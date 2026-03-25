import {
    createPicturePreviewExtension,
    extractPictureIds,
    findPictureCodeAtPosition,
} from './picture-tooltip';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { PictureBatchResponse, Picture } from '@drevo-web/shared';
import { of } from 'rxjs';

const MOCK_PICTURE: Picture = {
    id: 123,
    folder: 'folder1',
    title: 'Test picture',
    user: 'user1',
    date: new Date(),
    width: 800,
    height: 600,
    imageUrl: '/images/folder1/000123.jpg',
    thumbnailUrl: '/pictures/thumbs/folder1/000123.jpg',
};

describe('findPictureCodeAtPosition', () => {
    it('should find picture code when position is inside @123@', () => {
        const result = findPictureCodeAtPosition('text @123@ more', 6);

        expect(result).toEqual({ id: 123, from: 5, to: 10 });
    });

    it('should find picture code when position is at the opening @', () => {
        const result = findPictureCodeAtPosition('text @123@ more', 5);

        expect(result).toEqual({ id: 123, from: 5, to: 10 });
    });

    it('should find picture code when position is at the closing @', () => {
        const result = findPictureCodeAtPosition('text @123@ more', 10);

        expect(result).toEqual({ id: 123, from: 5, to: 10 });
    });

    it('should return undefined when position is outside picture code', () => {
        const result = findPictureCodeAtPosition('text @123@ more', 2);

        expect(result).toBeUndefined();
    });

    it('should handle multiple picture codes in one line', () => {
        const line = '@100@ text @200@';

        const first = findPictureCodeAtPosition(line, 2);
        expect(first).toEqual({ id: 100, from: 0, to: 5 });

        const second = findPictureCodeAtPosition(line, 13);
        expect(second).toEqual({ id: 200, from: 11, to: 16 });
    });

    it('should return undefined for invalid formats', () => {
        expect(findPictureCodeAtPosition('@abc@', 2)).toBeUndefined();
        expect(findPictureCodeAtPosition('@@', 1)).toBeUndefined();
        expect(findPictureCodeAtPosition('@ @', 1)).toBeUndefined();
    });

    it('should return undefined for empty line', () => {
        expect(findPictureCodeAtPosition('', 0)).toBeUndefined();
    });

    it('should handle picture code at line start', () => {
        const result = findPictureCodeAtPosition('@456@ text', 0);

        expect(result).toEqual({ id: 456, from: 0, to: 5 });
    });
});

describe('extractPictureIds', () => {
    it('should extract unique picture IDs from text', () => {
        const ids = extractPictureIds('text @100@ and @200@ and @100@ again');

        expect(ids).toEqual([100, 200]);
    });

    it('should return empty array for text without picture codes', () => {
        expect(extractPictureIds('no pictures here')).toEqual([]);
    });

    it('should ignore invalid formats', () => {
        expect(extractPictureIds('@abc@ @@ @ @')).toEqual([]);
    });

    it('should handle picture codes on multiple lines', () => {
        const ids = extractPictureIds('@1@\n@2@\n@3@');

        expect(ids).toEqual([1, 2, 3]);
    });
});

describe('createPicturePreviewExtension', () => {
    it('should create a valid CM6 extension', () => {
        const batchResponse: PictureBatchResponse = {
            items: [MOCK_PICTURE],
            notFoundIds: [],
        };
        const extension = createPicturePreviewExtension({
            getPicturesBatch: () => of(batchResponse),
            onPictureClick: jest.fn(),
        });

        const state = EditorState.create({
            doc: 'text @123@ more',
            extensions: [extension],
        });

        expect(state).toBeDefined();
    });

    it('should apply pending decoration initially', () => {
        const batchResponse: PictureBatchResponse = {
            items: [],
            notFoundIds: [],
        };
        const extension = createPicturePreviewExtension({
            getPicturesBatch: () => of(batchResponse),
            onPictureClick: jest.fn(),
        });

        const state = EditorState.create({
            doc: '@123@',
            extensions: [extension],
        });
        const view = new EditorView({ state });
        const pendingElement = view.dom.querySelector('.cm-picture-pending');

        expect(pendingElement).not.toBeNull();
        expect(pendingElement?.textContent).toBe('@123@');

        view.destroy();
    });

    it('should apply resolved decoration after batch fetch', async () => {
        const batchResponse: PictureBatchResponse = {
            items: [MOCK_PICTURE],
            notFoundIds: [],
        };
        const extension = createPicturePreviewExtension({
            getPicturesBatch: () => of(batchResponse),
            onPictureClick: jest.fn(),
        });

        const state = EditorState.create({
            doc: '@123@',
            extensions: [extension],
        });
        const view = new EditorView({ state });

        // Wait for async fetch to resolve
        await new Promise(resolve => setTimeout(resolve, 0));

        const resolvedElement = view.dom.querySelector('.cm-picture-resolved');
        expect(resolvedElement).not.toBeNull();
        expect(resolvedElement?.textContent).toBe('@123@');

        view.destroy();
    });

    it('should apply error decoration for not-found pictures', async () => {
        const batchResponse: PictureBatchResponse = {
            items: [],
            notFoundIds: [999],
        };
        const extension = createPicturePreviewExtension({
            getPicturesBatch: () => of(batchResponse),
            onPictureClick: jest.fn(),
        });

        const state = EditorState.create({
            doc: '@999@',
            extensions: [extension],
        });
        const view = new EditorView({ state });

        await new Promise(resolve => setTimeout(resolve, 0));

        const errorElement = view.dom.querySelector('.cm-picture-error');
        expect(errorElement).not.toBeNull();
        expect(errorElement?.textContent).toBe('@999@');

        view.destroy();
    });

    it('should not refetch already cached pictures', async () => {
        const getPicturesBatch = jest.fn(() =>
            of<PictureBatchResponse>({
                items: [MOCK_PICTURE],
                notFoundIds: [],
            }),
        );
        const extension = createPicturePreviewExtension({
            getPicturesBatch,
            onPictureClick: jest.fn(),
        });

        const state = EditorState.create({
            doc: '@123@',
            extensions: [extension],
        });
        const view = new EditorView({ state });

        await new Promise(resolve => setTimeout(resolve, 0));

        // Trigger a doc change that doesn't affect the picture code
        view.dispatch({
            changes: { from: 0, to: 0, insert: 'prefix ' },
        });

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(getPicturesBatch).toHaveBeenCalledTimes(1);

        view.destroy();
    });
});
