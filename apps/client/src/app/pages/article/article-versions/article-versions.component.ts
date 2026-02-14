import { FilterEntry } from '../../../components/filters/filter.model';
import { FiltersSidePanelComponent } from '../../../components/filters/filters-side-panel/filters-side-panel.component';
import {
    ArticleHistoryService,
    HistoryFilter,
} from '../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from '../../history/tabs/articles/article-history-list/article-history-list.component';
import { ArticlePageService } from '../article-page.service';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ArticleHistoryItem } from '@drevo-web/shared';

@Component({
    selector: 'app-article-versions',
    imports: [ArticleHistoryListComponent, FiltersSidePanelComponent],
    templateUrl: './article-versions.component.html',
    styleUrl: './article-versions.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ArticleHistoryService],
})
export class ArticleVersionsComponent implements OnInit {
    private readonly service = inject(ArticleHistoryService);
    private readonly articlePageService = inject(ArticlePageService);
    private readonly router = inject(Router);

    private readonly _selectedVersionIds = signal<readonly number[]>([]);
    readonly selectedVersionIds = computed(() => new Set(this._selectedVersionIds()));
    readonly selectedCount = computed(() => this._selectedVersionIds().length);
    readonly canCompare = computed(() => this.selectedCount() === 2);

    readonly activeFilter = this.service.activeFilter;

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
        this.service.init({ articleId: this.articlePageService.articleId });
    }

    onFilterChange(filter: HistoryFilter): void {
        this.service.onFilterChange(filter);
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

    onCompare(): void {
        const [older, newer] = [...this._selectedVersionIds()].sort((a, b) => a - b);
        this.router.navigate(['/history/articles/diff', older, newer]);
    }
}
