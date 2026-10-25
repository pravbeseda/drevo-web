import { Injectable, inject, signal } from '@angular/core';
import { LoggerService, StorageService } from '@drevo-web/core';

export const AI_KEY_STORAGE_KEY = 'drevo-openrouter-key';

/** The moderator's own OpenRouter key; never logged. */
@Injectable({
    providedIn: 'root',
})
export class AiKeyService {
    private readonly storage = inject(StorageService);
    private readonly logger = inject(LoggerService).withContext('AiKeyService');

    private readonly _key = signal<string | undefined>(this.storage.getString(AI_KEY_STORAGE_KEY));
    readonly key = this._key.asReadonly();

    save(key: string): void {
        const trimmed = key.trim();
        if (!trimmed) return;

        this.storage.setString(AI_KEY_STORAGE_KEY, trimmed);
        this._key.set(trimmed);
        this.logger.info('AI key saved');
    }

    remove(): void {
        this.storage.remove(AI_KEY_STORAGE_KEY);
        this._key.set(undefined);
        this.logger.info('AI key removed');
    }
}
