import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TextInputComponent } from '@drevo-web/ui';
import { ArticleSearchResult } from '@drevo-web/shared';
import {
    debounceTime,
    distinctUntilChanged,
    filter,
    Subject,
    switchMap,
} from 'rxjs';
import { ArticleService } from '../../services/articles';

const DEBOUNCE_TIME_MS = 500;

@Component({
    selector: 'app-search',
    imports: [CommonModule, RouterLink, TextInputComponent],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit {
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly searchSubject = new Subject<string>();

    readonly searchQuery = signal('');
    readonly searchResults = signal<readonly ArticleSearchResult[]>([]);
    readonly isLoading = signal(false);
    readonly totalResults = signal(0);

    ngOnInit(): void {
        this.searchSubject
            .pipe(
                debounceTime(DEBOUNCE_TIME_MS),
                distinctUntilChanged(),
                filter(query => query.trim().length > 0),
                switchMap(query => {
                    this.isLoading.set(true);
                    return this.articleService.searchArticles({ query });
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
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

    onSearchChange(value: string): void {
        this.searchQuery.set(value);

        if (value.trim().length === 0) {
            this.searchResults.set([]);
            this.totalResults.set(0);
            return;
        }

        this.searchSubject.next(value);
    }
}
