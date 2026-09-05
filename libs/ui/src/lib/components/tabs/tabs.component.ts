import { BadgeComponent } from '../badge/badge.component';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';

export interface TabItem {
    readonly label: string;
    readonly route: string;
    readonly badge?: number;
    readonly testId?: string;
    /** Hint shown on hover; the tab label stays the accessible name. */
    readonly tooltip?: string;
    /**
     * Set on a tab whose route is the prefix of another tab's: only its own
     * path activates it. The query string never decides which tab is open.
     */
    readonly exact?: boolean;
}

/**
 * Angular's own `{ exact: true }` shorthand would pin the query string too, so
 * a tab would go dark on its own address as soon as it carried `?page=2`.
 */
const EXACT_PATH_MATCH: IsActiveMatchOptions = {
    paths: 'exact',
    fragment: 'ignored',
    matrixParams: 'ignored',
    queryParams: 'subset',
};

const PREFIX_PATH_MATCH: IsActiveMatchOptions = { ...EXACT_PATH_MATCH, paths: 'subset' };

@Component({
    selector: 'ui-tabs',
    imports: [MatTabsModule, MatTooltip, RouterLink, RouterLinkActive, BadgeComponent],
    templateUrl: './tabs.component.html',
    styleUrl: './tabs.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
    tabs = input.required<TabItem[]>();

    protected readonly exactPathMatch = EXACT_PATH_MATCH;
    protected readonly prefixPathMatch = PREFIX_PATH_MATCH;
}
