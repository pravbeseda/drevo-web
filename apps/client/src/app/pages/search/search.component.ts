import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextInputComponent } from '@drevo-web/ui';
import { ArticleSearchResult } from '@drevo-web/shared';
import { ArticleService } from '../../services/articles';

@Component({
    selector: 'app-search',
    imports: [CommonModule, TextInputComponent],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
    private readonly articleService = inject(ArticleService);

    readonly searchQuery = signal('');
    readonly searchResults = signal<readonly ArticleSearchResult[]>([]);
    readonly isLoading = signal(false);
    readonly totalResults = signal(0);

    onSearchChange(value: string): void {
        this.searchQuery.set(value);

        if (value.trim().length === 0) {
            this.searchResults.set([]);
            this.totalResults.set(0);
            return;
        }

        this.performSearch(value);
    }

    private performSearch(query: string): void {
        this.isLoading.set(true);

        this.articleService.searchArticles({ query }).subscribe({
            next: response => {
                this.searchResults.set(response.items);
                this.totalResults.set(response.total);
                this.isLoading.set(false);
            },
            error: () => {
                this.searchResults.set([]);
                this.totalResults.set(0);
                this.isLoading.set(false);
            },
        });
    }
}
