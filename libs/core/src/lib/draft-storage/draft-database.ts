import { Draft } from './draft.model';
import Dexie, { Table } from 'dexie';

/**
 * Dexie database wrapper for draft storage.
 * DB name: 'drevo-drafts', compound PK: [userId+route].
 */
export class DraftDatabase extends Dexie {
    drafts!: Table<Draft, [string, string]>;

    constructor() {
        super('drevo-drafts');

        this.version(1).stores({
            drafts: '[userId+route], userId, time',
        });
    }

    async saveDraft(draft: Draft): Promise<void> {
        await this.drafts.put(draft);
    }

    async getDraft(userId: string, route: string): Promise<Draft | undefined> {
        return this.drafts.get([userId, route]);
    }

    async getAllDrafts(userId: string): Promise<Draft[]> {
        return this.drafts.where('userId').equals(userId).reverse().sortBy('time');
    }

    async countDrafts(userId: string): Promise<number> {
        return this.drafts.where('userId').equals(userId).count();
    }

    async deleteDraft(userId: string, route: string): Promise<void> {
        await this.drafts.delete([userId, route]);
    }

    async deleteAllDrafts(userId: string): Promise<void> {
        await this.drafts.where('userId').equals(userId).delete();
    }
}
