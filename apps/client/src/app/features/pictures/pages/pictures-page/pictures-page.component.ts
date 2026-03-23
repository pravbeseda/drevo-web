import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureRowComponent } from '../../components/picture-row/picture-row.component';
import { PictureSearchBarComponent } from '../../components/picture-search-bar/picture-search-bar.component';
import { PicturesStateService } from '../../services/pictures-state.service';
import { isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    OnInit,
    PLATFORM_ID,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { Picture } from '@drevo-web/shared';
import {
    MODAL_DATA,
    ModalData,
    SpinnerComponent,
    VirtualScrollerComponent,
    VirtualScrollerItemDirective,
} from '@drevo-web/ui';
import { debounceTime, Subject } from 'rxjs';

@Component({
    selector: 'app-pictures-page',
    imports: [
        PictureSearchBarComponent,
        PictureRowComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
    ],
    providers: [PicturesStateService],
    templateUrl: './pictures-page.component.html',
    styleUrl: './pictures-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicturesPageComponent implements OnInit {
    private readonly state = inject(PicturesStateService);
    private readonly lightboxService = inject(PictureLightboxService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('PicturesComponent');
    private readonly modalData = inject<ModalData<undefined, string>>(MODAL_DATA, { optional: true });
    private readonly platformId = inject(PLATFORM_ID);
    private readonly resizeSubject = new Subject<number>();
    private resizeObserver: ResizeObserver | undefined;

    private readonly galleryContainer = viewChild<ElementRef<HTMLElement>>('galleryContainer');

    readonly isSelectMode = !!this.modalData;
    readonly isLoading = this.state.isLoading;
    readonly isLoadingMore = this.state.isLoadingMore;
    readonly rows = this.state.rows;
    readonly totalRows = this.state.totalRows;
    readonly hasResults = this.state.hasResults;
    readonly showNoResults = this.state.showNoResults;
    readonly trackByFn = this.state.trackByFn;

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.resizeObserver?.disconnect();
        });

        // React to gallery container appearing/disappearing in DOM (inside @if)
        effect(() => {
            const container = this.galleryContainer();
            this.resizeObserver?.disconnect();
            if (container) {
                this.observeResize(container.nativeElement);
            }
        });
    }

    ngOnInit(): void {
        this.resizeSubject
            .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
            .subscribe(width => this.state.onContainerResize(width));

        this.state.init();
    }

    onSearchChange(value: string): void {
        this.state.onSearchChange(value);
    }

    onLoadMore(): void {
        this.state.loadMore();
    }

    onPictureClick(picture: Picture): void {
        if (this.isSelectMode) {
            this.logger.info('Picture selected', { id: picture.id });
            this.modalData?.close(`@${picture.id}@`);
        } else {
            this.logger.info('Opening lightbox', { id: picture.id });
            this.lightboxService.open(picture.id);
        }
    }

    private observeResize(element: HTMLElement): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        // Observe the CDK viewport element — its contentRect.width excludes the scrollbar
        const viewport = element.querySelector('cdk-virtual-scroll-viewport') ?? element;

        this.resizeObserver = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                this.resizeSubject.next(entry.contentRect.width);
            }
        });
        this.resizeObserver.observe(viewport);
    }
}
