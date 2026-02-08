import { ArticlePageService } from './article-page.service';
import { ErrorComponent } from '../error/error.component';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    OnInit,
} from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import {
    SidebarActionDirective,
    SpinnerComponent,
    TabGroup,
    TabsGroupComponent,
} from '@drevo-web/ui';

@Component({
    selector: 'app-article',
    imports: [
        SpinnerComponent,
        SidebarActionDirective,
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
    private readonly logger =
        inject(LoggerService).withContext('ArticleComponent');

    readonly article = this.pageService.article;
    readonly isLoading = this.pageService.isLoading;
    readonly error = this.pageService.error;
    readonly editUrl = this.pageService.editUrl;
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
                        exactRouteMatch: true,
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

    openTableOfContents(): void {
        this.logger.info('Open table of contents');
    }
}
