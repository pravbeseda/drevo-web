import { ArticleService } from '../../../../services/articles';
import { ArticleContentComponent } from '../../article-content/article-content.component';
import { ArticlePageService } from '../../article-page.service';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import {
    APPROVAL_CLASS,
    APPROVAL_ICONS,
    APPROVAL_TITLES,
    ArticleVersion,
} from '@drevo-web/shared';
import { FormatTimePipe, IconComponent, SpinnerComponent } from '@drevo-web/ui';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Component({
    selector: 'app-article-version-tab',
    imports: [
        ArticleContentComponent,
        NgClass,
        RouterLink,
        FormatTimePipe,
        IconComponent,
        SpinnerComponent,
    ],
    templateUrl: './article-version-tab.component.html',
    styleUrl: './article-version-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleVersionTabComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly articleService = inject(ArticleService);
    private readonly pageService = inject(ArticlePageService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger =
        inject(LoggerService).withContext('ArticleVersionTab');

    readonly version = signal<ArticleVersion | undefined>(undefined);
    readonly isLoading = signal(false);
    readonly error = signal<string | undefined>(undefined);

    readonly articleUrl = computed(() => {
        const id = this.pageService.articleId();
        return id ? `/articles/${id}` : undefined;
    });

    readonly approvalClass = computed(() => {
        const approved = this.version()?.approved;
        return approved !== undefined ? APPROVAL_CLASS[approved] : undefined;
    });

    readonly statusIcon = computed(() => {
        const cls = this.approvalClass();
        return cls ? APPROVAL_ICONS[cls] : undefined;
    });

    readonly statusTitle = computed(() => {
        const cls = this.approvalClass();
        return cls ? APPROVAL_TITLES[cls] : undefined;
    });

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                map(params => {
                    const idParam = params.get('versionId');
                    return idParam ? parseInt(idParam, 10) : NaN;
                }),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(versionId => {
                if (isNaN(versionId) || versionId <= 0) {
                    this.version.set(undefined);
                    this.error.set('Неверный ID версии');
                    this.isLoading.set(false);
                    this.logger.error('Invalid version ID', versionId);
                    return;
                }

                this.loadVersion(versionId);
            });
    }

    private loadVersion(versionId: number): void {
        this.version.set(undefined);
        this.isLoading.set(true);
        this.error.set(undefined);

        this.articleService
            .getVersionShow(versionId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: version => {
                    const expectedArticleId = this.pageService.articleId();
                    if (
                        expectedArticleId &&
                        version.articleId !== expectedArticleId
                    ) {
                        this.logger.info(
                            'Version belongs to different article, redirecting',
                            {
                                versionId: version.versionId,
                                urlArticleId: expectedArticleId,
                                actualArticleId: version.articleId,
                            }
                        );
                        this.router.navigate(
                            [
                                '/articles',
                                version.articleId,
                                'version',
                                version.versionId,
                            ],
                            { replaceUrl: true }
                        );
                        return;
                    }

                    this.version.set(version);
                    this.isLoading.set(false);
                    this.logger.info('Version loaded', {
                        articleId: version.articleId,
                        versionId: version.versionId,
                    });
                },
                error: (err: HttpErrorResponse) => {
                    this.version.set(undefined);
                    this.logger.error('Failed to load version', {
                        versionId,
                        status: err.status,
                    });
                    this.error.set(
                        err.status === 404
                            ? 'Версия не найдена'
                            : 'Ошибка загрузки версии'
                    );
                    this.isLoading.set(false);
                },
            });
    }
}
