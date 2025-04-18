import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { EditorComponent } from '@drevo-web/editor';
import { ArticleService } from '../../../services/article/article.service';
import { BehaviorSubject, first, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { Article } from '@drevo-web/shared';
import { IframeService } from '../../../services/iframe/iframe.service';
import { LinksService } from '../../../services/links/links.service';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-article-edit',
    imports: [EditorComponent, AsyncPipe],
    providers: [HttpClient, ArticleService, IframeService, LinksService],
    templateUrl: './article-edit.component.html',
    styleUrl: './article-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements AfterViewInit {
    private readonly updateLinksStateSubject = new BehaviorSubject<
        Record<string, boolean>
    >({});

    readonly article$: Observable<Article>;
    readonly updateLinksState$ = this.updateLinksStateSubject.asObservable();

    constructor(
        private readonly articleService: ArticleService,
        private readonly linkService: LinksService,
        private readonly iframeService: IframeService
    ) {
        this.article$ = this.articleService.getArticle();
    }

    ngAfterViewInit(): void {
        this.iframeService.sendMessage({ action: 'editorReady' });
    }

    updateLinks(links: string[]): void {
        this.linkService
            .getLinkStatuses(links)
            .pipe(first())
            .subscribe(linksState => {
                this.updateLinksStateSubject.next(linksState);
            });
    }
}
