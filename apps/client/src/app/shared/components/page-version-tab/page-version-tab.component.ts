import { ArticleService } from '../../../services/articles';
import { pageUrl, versionUrl } from '../../helpers/page-kind';
import { parsePositiveIntParam, readRouteParam } from '../../helpers/route-params';
import { PageContext } from '../../services/page-context/page-context';
import { PageSidebarActionsComponent } from '../page-sidebar-actions/page-sidebar-actions.component';
import { ReviewBlockComponent } from '../review-block/review-block.component';
import { WikiContentComponent } from '../wiki-content/wiki-content.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ApprovalStatus, ArticleVersion, ModerationResult, PageKind, REVIEW_TARGET } from '@drevo-web/shared';
import { BannerComponent } from '@drevo-web/ui/banner';
import { FormatDatePipe } from '@drevo-web/ui/format-date';
import { SpinnerComponent } from '@drevo-web/ui/spinner';
import { StatusIconComponent } from '@drevo-web/ui/status-icon';
import { distinctUntilChanged, map } from 'rxjs/operators';

/** How the banner names a version of each page kind and its current version. */
const VERSION_LABELS: Readonly<Record<PageKind, { readonly version: string; readonly current: string }>> = {
    articles: { version: 'Версия статьи', current: 'Перейти к текущей версии статьи' },
    news: { version: 'Версия новости', current: 'Перейти к текущей версии новости' },
};

/** One version of an article or a news item, under its page. */
@Component({
    selector: 'app-page-version-tab',
    imports: [
        WikiContentComponent,
        PageSidebarActionsComponent,
        ReviewBlockComponent,
        BannerComponent,
        RouterLink,
        StatusIconComponent,
        SpinnerComponent,
        FormatDatePipe,
    ],
    templateUrl: './page-version-tab.component.html',
    styleUrl: './page-version-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageVersionTabComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly articleService = inject(ArticleService);
    private readonly page = inject(PageContext);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ArticleVersionTab');

    private readonly _version = signal<ArticleVersion | undefined>(undefined);
    private readonly _isLoading = signal(false);
    private readonly _error = signal<string | undefined>(undefined);

    readonly version = this._version.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly kind = this.page.kind;
    readonly labels = VERSION_LABELS[this.kind];
    readonly reviewTarget = REVIEW_TARGET[this.kind];

    readonly articleUrl = computed(() => {
        const id = this.page.articleId();
        return id ? pageUrl(this.kind, id) : undefined;
    });

    readonly versionEditUrl = computed(() => {
        const v = this.version();
        return v ? `${versionUrl(this.kind, v.articleId, v.versionId)}/edit` : undefined;
    });

    readonly ApprovalStatus = ApprovalStatus;

    onModerated(result: ModerationResult): void {
        this._version.update(v => (v ? { ...v, approved: result.approved, comment: result.comment } : v));
    }

    onTopicsChanged(topics: ReadonlyArray<number>): void {
        this._version.update(v => (v ? { ...v, topics } : v));
    }

    ngOnInit(): void {
        // `url`, not `paramMap`: the router emits params only when the merged
        // map changes (`_router-chunk.mjs:1632`), and a matrix value is exactly
        // what leaves it unchanged — `/version/456;versionId=789` reads the same
        // `789` as `/version/789`. The segments differ, so `url` does emit, and
        // the snapshot is already current when it does.
        this.route.url
            .pipe(
                map(() => readRouteParam(this.route.snapshot, 'versionId')),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(idParam => {
                const versionId = parsePositiveIntParam(idParam);
                if (versionId === undefined) {
                    this._version.set(undefined);
                    this._error.set('Неверный ID версии');
                    this._isLoading.set(false);
                    this.logger.error('Invalid version ID', idParam);
                    return;
                }

                this.loadVersion(versionId);
            });
    }

    private loadVersion(versionId: number): void {
        this._version.set(undefined);
        this._isLoading.set(true);
        this._error.set(undefined);

        this.articleService
            .getVersionShow(versionId, this.kind)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: version => {
                    const expectedArticleId = this.page.articleId();
                    if (expectedArticleId && version.articleId !== expectedArticleId) {
                        this.logger.info('Version belongs to different article, redirecting', {
                            versionId: version.versionId,
                            urlArticleId: expectedArticleId,
                            actualArticleId: version.articleId,
                        });
                        void this.router.navigateByUrl(versionUrl(this.kind, version.articleId, version.versionId), {
                            replaceUrl: true,
                        });
                        return;
                    }

                    this._version.set(version);
                    this._isLoading.set(false);
                    this.logger.info('Version loaded', {
                        articleId: version.articleId,
                        versionId: version.versionId,
                    });
                },
                error: (err: HttpErrorResponse) => {
                    this._version.set(undefined);
                    this.logger.error('Failed to load version', {
                        versionId,
                        status: err.status,
                    });
                    this._error.set(err.status === 404 ? 'Версия не найдена' : 'Ошибка загрузки версии');
                    this._isLoading.set(false);
                },
            });
    }
}
