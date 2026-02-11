import { HistoryFilter } from '../../services/articles/article-history/article-history.service';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
    selector: 'app-article-filters',
    templateUrl: './article-filters.component.html',
    styleUrl: './article-filters.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleFiltersComponent {
    readonly activeFilter = input.required<HistoryFilter>();
    readonly canFilterByAuthor = input(false);
    readonly filterChange = output<HistoryFilter>();

    onSelect(filter: HistoryFilter): void {
        this.filterChange.emit(filter);
    }
}
