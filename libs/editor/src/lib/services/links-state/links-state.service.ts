import { Injectable } from '@angular/core';

@Injectable()
export class LinksStateService {
    private linkStatusCache: Record<string, boolean | 'pending'> = {};

    async fetchLinkStatuses(links: string[]): Promise<void> {
        const uncachedLinks = links.filter(link => this.linkStatusCache[link] === undefined);

        if (uncachedLinks.length === 0) return;

        // try {
        //     const response = await fetch('/api/check-links', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({ links: uncachedLinks }),
        //     });
        //
        //     if (!response.ok) {
        //         throw new Error('Failed to fetch link statuses');
        //     }
        //
        //     const statuses = await response.json();
        //     for (const link of Object.keys(statuses)) {
        //         this.linkStatusCache[link] = statuses[link];
        //     }
        // } catch (error) {
        //     console.error('Failed to fetch link statuses:', error);
        // }

        for (let i = 0; i < uncachedLinks.length; i++) {
            this.linkStatusCache[uncachedLinks[i]] = i % 2 === 0;
        }
    }

    getLinkStatus(link: string): boolean | 'pending' | undefined {
        return this.linkStatusCache[link];
    }

    resetCache(): void {
        this.linkStatusCache = {};
    }
}
