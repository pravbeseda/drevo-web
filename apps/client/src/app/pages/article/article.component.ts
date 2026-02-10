import { ArticlePageService } from './article-page.service';
import { ErrorComponent } from '../error/error.component';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    OnInit,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    ActivatedRoute,
    NavigationEnd,
    Router,
    RouterOutlet,
} from '@angular/router';
import { SpinnerComponent, TabGroup, TabsGroupComponent } from '@drevo-web/ui';
import { filter, map } from 'rxjs';

@Component({
    selector: 'app-article',
    imports: [
        SpinnerComponent,
        ErrorComponent,
        TabsGroupComponent,
        RouterOutlet,
    ],
    templateUrl: './article.component.html',
    styleUrl: './article.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComponent implements OnInit {
    private readonly pageService = inject(ArticlePageService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    private readonly url = toSignal(
        this.router.events.pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            map(e => e.urlAfterRedirects)
        ),
        { initialValue: this.router.url }
    );

    private readonly articleTabActive = computed(() => {
        const path = this.router
            .parseUrl(this.url())
            .root.children['primary']?.segments.map(s => s.path)
            .join('/');
        const id = this.pageService.articleId();
        if (!id) return false;
        const base = `articles/${id}`;
        return path === base || path?.startsWith(`${base}/version/`);
    });

    readonly article = this.pageService.article;
    readonly isLoading = this.pageService.isLoading;
    readonly error = this.pageService.error;
    readonly title = this.pageService.title;

    readonly tabGroups = computed<TabGroup[]>(() => {
        const id = this.pageService.articleId();
        if (!id) {
            return [];
        }
        const base = `/articles/${id}`;
        return [
            {
                items: [
                    {
                        label: 'Статья',
                        route: base,
                        icon: 'article',
                        isActive: this.articleTabActive,
                    },
                    {
                        label: 'Новости',
                        route: `${base}/news`,
                        icon: 'newspaper',
                    },
                    {
                        label: 'Обсуждение',
                        route: `${base}/forum`,
                        icon: 'forum',
                    },
                ],
            },
            {
                items: [
                    {
                        label: 'Версии',
                        route: `${base}/history`,
                        icon: 'history',
                    },
                    {
                        label: 'Кто ссылается',
                        route: `${base}/linkedhere`,
                        icon: 'link',
                    },
                ],
                align: 'end',
            },
        ];
    });

    ngOnInit(): void {
        this.pageService.init(this.route);
    }
}
