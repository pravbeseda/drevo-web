/**
 * Full stored draft record in IndexedDB.
 * Compound primary key: [userId+route]
 */
export interface Draft {
    readonly userId: string;
    readonly route: string;
    readonly title: string;
    readonly text: string;
    readonly time: number; // Epoch ms (Date.now())
}

/**
 * Input type for save() — without userId and time,
 * which are set automatically by DraftStorageService.
 */
export interface DraftInput {
    readonly route: string;
    readonly title: string;
    readonly text: string;
}
