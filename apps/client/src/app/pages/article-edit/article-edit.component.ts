import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { EditorComponent } from '@drevo-web/editor';
import { SpinnerComponent } from '@drevo-web/ui';
import { ErrorComponent } from '../error/error.component';
import { ArticleVersion } from '@drevo-web/shared';
import { ArticleService } from '../../services/articles';
// import { LinksService } from '../../services/links/links.service';
import { LoggerService } from '@drevo-web/core';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-article-edit',
    imports: [EditorComponent, SpinnerComponent, AsyncPipe, ErrorComponent],
    // providers: [LinksService],
    templateUrl: './article-edit.component.html',
    styleUrl: './article-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly articleService = inject(ArticleService);
    // private readonly linksService = inject(LinksService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext(
        'ArticleEditComponent'
    );

    private readonly updateLinksStateSubject = new BehaviorSubject<
        Record<string, boolean>
    >({});

    readonly version = signal<ArticleVersion | undefined>(undefined);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | undefined>(undefined);
    readonly updateLinksState$ = this.updateLinksStateSubject.asObservable();

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                map(params => {
                    const idParam = params.get('id');
                    return idParam ? parseInt(idParam, 10) : NaN;
                }),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(id => {
                if (isNaN(id) || id <= 0) {
                    this.version.set(undefined);
                    this.error.set('Неверный ID версии');
                    this.logger.error('Invalid version ID', id);
                    this.isLoading.set(false);
                    return;
                }

                this.loadVersion(id);
            });
    }

    private loadVersion(versionId: number): void {
        this.version.set(undefined);
        this.isLoading.set(true);
        this.error.set(undefined);

        this.articleService
            .getArticleVersion(versionId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: version => {
                    this.version.set(version);
                    this.isLoading.set(false);
                    this.logger.info('Version loaded for editing', {
                        versionId: version.versionId,
                        articleId: version.articleId,
                        title: version.title,
                    });
                },
                error: (err: HttpErrorResponse) => {
                    this.version.set(undefined);
                    if (err.status === 404) {
                        this.error.set('Версия не найдена');
                    } else if (err.status === 403) {
                        this.error.set('Доступ запрещён');
                    } else {
                        this.error.set('Ошибка загрузки версии');
                    }
                    this.isLoading.set(false);
                },
            });
    }

    updateLinks(_links: string[]): void {
        // this.linksService
        //     .getLinkStatuses(links)
        //     .pipe(first())
        //     .subscribe(linksState => {
        //         this.updateLinksStateSubject.next(linksState);
        //     });
    }

    contentChanged(content: string): void {
        this.logger.debug('Content changed', { length: content.length });
    }
}
