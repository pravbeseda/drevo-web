import {
    ArticleHistoryService,
    HistoryFilter,
} from '../../../services/articles/article-history/article-history.service';
import { diffUrl } from '../../helpers/page-kind';
import { FilterEntry } from '../../models/filter.model';
import { PageContext } from '../../services/page-context/page-context';
import { ArticleHistoryListComponent } from '../article-history-list/article-history-list.component';
import { FiltersSidePanelComponent } from '../filters/filters-side-panel/filters-side-panel.component';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ArticleHistoryItem, ModerationResult } from '@drevo-web/shared';

@Component({
    selector: 'app-page-versions',
    imports: [ArticleHistoryListComponent, FiltersSidePanelComponent],
    templateUrl: './page-versions.component.html',
    styleUrl: './page-versions.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ArticleHistoryService],
})
/** The versions tab of an article or a news item: its history, filtered, with two versions picked for a diff. */
export class PageVersionsComponent implements OnInit {
    private readonly service = inject(ArticleHistoryService);
    private readonly page = inject(PageContext);
    private readonly router = inject(Router);

    private readonly _selectedVersionIds = signal<readonly number[]>([]);
    readonly selectedVersionIds = computed(() => new Set(this._selectedVersionIds()));
    readonly selectedCount = computed(() => this._selectedVersionIds().length);
    readonly canCompare = computed(() => this.selectedCount() === 2);

    readonly activeFilter = this.service.activeFilter;
    readonly hideCancelled = this.service.hideCancelled;

    readonly filters = computed<readonly FilterEntry<HistoryFilter>[]>(() => {
        const entries: FilterEntry<HistoryFilter>[] = [
            { key: 'all', label: 'Все' },
            { key: 'unchecked', label: 'Непроверенные' },
        ];
        if (this.service.isAuthenticated()) {
            entries.push({ key: 'my', label: 'Мои' });
        }
        return entries;
    });

    ngOnInit(): void {
        this.service.init({ articleId: this.page.articleId, kind: this.page.kind });
    }

    onFilterChange(filter: HistoryFilter): void {
        this.service.onFilterChange(filter);
    }

    onHideCancelledChange(value: boolean): void {
        this.service.onHideCancelledChange(value);
    }

    onSelectItem(item: ArticleHistoryItem): void {
        const ids = this._selectedVersionIds();
        const index = ids.indexOf(item.versionId);

        if (index !== -1) {
            this._selectedVersionIds.set(ids.filter(id => id !== item.versionId));
        } else if (ids.length < 2) {
            this._selectedVersionIds.set([...ids, item.versionId]);
        } else {
            const minId = Math.min(...ids);
            const remaining = ids.find(id => id !== minId) ?? ids[0];
            this._selectedVersionIds.set([remaining, item.versionId]);
        }
    }

    @HostListener('document:keydown.escape')
    onEscapePress(): void {
        if (this.selectedCount() > 0) {
            this._selectedVersionIds.set([]);
        }
    }

    onModerated({ versionId, approved, comment }: ModerationResult): void {
        if (this.page.article()?.versionId === versionId) {
            this.page.updateApproval(approved, comment);
        }
    }

    onCompare(): void {
        const [older, newer] = [...this._selectedVersionIds()].sort((a, b) => a - b);
        void this.router.navigateByUrl(diffUrl(this.page.kind, older, newer));
    }
}
