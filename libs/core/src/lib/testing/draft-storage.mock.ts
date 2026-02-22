import { DraftStorageService } from '../draft-storage/draft-storage.service';
import { DRAFT_USER_ID_PROVIDER } from '../draft-storage/draft-user-id.token';

export class MockDraftStorageService {
    save = jest.fn().mockResolvedValue(undefined);
    getByRoute = jest.fn().mockResolvedValue(undefined);
    getAll = jest.fn().mockResolvedValue([]);
    getCount = jest.fn().mockResolvedValue(0);
    deleteByRoute = jest.fn().mockResolvedValue(undefined);
    deleteAll = jest.fn().mockResolvedValue(undefined);
}

export function mockDraftStorageProvider() {
    return {
        provide: DraftStorageService,
        useClass: MockDraftStorageService,
    };
}

export function mockDraftUserIdProvider(userId = 'test-user') {
    return {
        provide: DRAFT_USER_ID_PROVIDER,
        useValue: () => userId,
    };
}
