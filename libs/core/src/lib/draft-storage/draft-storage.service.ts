import { DraftDatabase } from './draft-database';
import { DRAFT_USER_ID_PROVIDER } from './draft-user-id.token';
import { Draft, DraftInput } from './draft.model';
import { LoggerService } from '../logging/logger.service';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

const NOT_AUTHENTICATED_ERROR = 'DraftStorageService: user is not authenticated';

@Injectable({ providedIn: 'root' })
export class DraftStorageService {
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly logger = inject(LoggerService).withContext('DraftStorageService');
    private readonly getUserIdFn = inject(DRAFT_USER_ID_PROVIDER);

    private db: DraftDatabase | undefined;

    private getDatabase(): DraftDatabase {
        if (!this.db) {
            this.db = new DraftDatabase();
        }
        return this.db;
    }

    private getUserId(): string | undefined {
        return this.getUserIdFn();
    }

    private requireUserId(): string {
        const userId = this.getUserId();
        if (userId === undefined) {
            this.logger.error(NOT_AUTHENTICATED_ERROR);
            throw new Error(NOT_AUTHENTICATED_ERROR);
        }
        return userId;
    }

    async save(input: DraftInput): Promise<void> {
        if (!this.isBrowser) return;

        const userId = this.requireUserId();
        const draft: Draft = {
            userId,
            route: input.route,
            title: input.title,
            text: input.text,
            time: Date.now(),
        };

        this.logger.debug('Saving draft', { route: input.route });
        await this.getDatabase().saveDraft(draft);
    }

    async getByRoute(route: string): Promise<Draft | undefined> {
        if (!this.isBrowser) return undefined;

        const userId = this.requireUserId();
        this.logger.debug('Getting draft by route', { route });
        return this.getDatabase().getDraft(userId, route);
    }

    async getAll(): Promise<Draft[]> {
        if (!this.isBrowser) return [];

        const userId = this.requireUserId();
        this.logger.debug('Getting all drafts');
        return this.getDatabase().getAllDrafts(userId);
    }

    async getCount(): Promise<number> {
        if (!this.isBrowser) return 0;

        const userId = this.requireUserId();
        this.logger.debug('Getting draft count');
        return this.getDatabase().countDrafts(userId);
    }

    async deleteByRoute(route: string): Promise<void> {
        if (!this.isBrowser) return;

        const userId = this.requireUserId();
        this.logger.debug('Deleting draft', { route });
        await this.getDatabase().deleteDraft(userId, route);
    }

    async deleteAll(): Promise<void> {
        if (!this.isBrowser) return;

        const userId = this.requireUserId();
        this.logger.debug('Deleting all drafts');
        await this.getDatabase().deleteAllDrafts(userId);
    }
}
