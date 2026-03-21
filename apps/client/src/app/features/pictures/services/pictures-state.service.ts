import { buildRows, PictureRow } from './picture-row-builder';
import { PictureService } from '../../../services/pictures';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Logger, LoggerService } from '@drevo-web/core';
import { Picture } from '@drevo-web/shared';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';

const DEBOUNCE_TIME_MS = 500;
const TARGET_ROW_HEIGHT = 200;

@Injectable()
export class PicturesStateService {
    private readonly pictureService = inject(PictureService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger: Logger = inject(LoggerService).withContext('PicturesStateService');

    private readonly _pictures = signal<Picture[]>([]);
    private readonly _isLoading = signal(false);
    private readonly _isLoadingMore = signal(false);
    private readonly _totalItems = signal(0);
    private readonly _currentPage = signal(1);
    private readonly _containerWidth = signal(0);
    private readonly _searchQuery = signal('');

    private readonly searchSubject = new Subject<string>();

    readonly isLoading = this._isLoading.asReadonly();
    readonly isLoadingMore = this._isLoadingMore.asReadonly();
    readonly totalItems = this._totalItems.asReadonly();
    readonly searchQuery = this._searchQuery.asReadonly();

    readonly rows = computed<readonly PictureRow[]>(() => {
        const pictures = this._pictures();
        const width = this._containerWidth();
        if (width <= 0 || pictures.length === 0) {
            return [];
        }
        return buildRows(pictures, width, TARGET_ROW_HEIGHT);
    });

    readonly totalRows = computed(() => {
        const total = this._totalItems();
        const loaded = this._pictures().length;
        const rowCount = this.rows().length;
        if (loaded === 0 || total === 0) return 0;
        // Estimate total rows based on ratio
        return Math.ceil((total / loaded) * rowCount);
    });

    readonly hasResults = computed(() => this._pictures().length > 0 && !this._isLoading());
    readonly showNoResults = computed(
        () =>
            this._searchQuery().length > 0 &&
            !this._isLoading() &&
            this._totalItems() === 0 &&
            this._pictures().length === 0,
    );

    readonly trackByFn = (_index: number, row: PictureRow): string => row.items.map(item => item.picture.id).join(',');

    init(): void {
        this.searchSubject
            .pipe(
                startWith(''),
                map(query => query.trim()),
                distinctUntilChanged(),
                debounceTime(DEBOUNCE_TIME_MS),
                switchMap(query => {
                    this._isLoading.set(true);
                    this._isLoadingMore.set(false);
                    this._currentPage.set(1);
                    this.logger.info('Searching pictures', { query });
                    return this.pictureService.getPictures({ query, page: 1 }).pipe(
                        catchError(error => {
                            this.logger.error('Failed to load pictures', error);
                            return of({ items: [] as Picture[], total: 0 });
                        }),
                    );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(response => {
                this._pictures.set([...response.items]);
                this._totalItems.set(response.total);
                this._isLoading.set(false);
            });
    }

    onSearchChange(value: string): void {
        this._searchQuery.set(value);
        this.searchSubject.next(value);
    }

    onContainerResize(width: number): void {
        this._containerWidth.set(width);
    }

    loadMore(): void {
        if (this._isLoadingMore()) {
            return;
        }

        const currentPictures = this._pictures();
        if (currentPictures.length >= this._totalItems()) {
            return;
        }

        const nextPage = this._currentPage() + 1;
        const queryAtRequest = this._searchQuery();
        this._isLoadingMore.set(true);

        this.pictureService
            .getPictures({ query: queryAtRequest, page: nextPage })
            .pipe(
                catchError(error => {
                    this.logger.error('Failed to load more pictures', error);
                    return of({ items: [] as Picture[], total: 0 });
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(response => {
                if (this._searchQuery() !== queryAtRequest) {
                    this._isLoadingMore.set(false);
                    return;
                }
                if (response.items.length > 0) {
                    this._pictures.set([...this._pictures(), ...response.items]);
                    this._currentPage.set(nextPage);
                }
                this._isLoadingMore.set(false);
            });
    }
}
