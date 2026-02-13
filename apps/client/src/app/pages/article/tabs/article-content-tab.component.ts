import { ArticleContentComponent } from '../article-content/article-content.component';
import { ArticlePageService } from '../article-page.service';
import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-article-content-tab',
    imports: [ArticleContentComponent],
    template: `
        @if (article(); as article) {
            <app-article-content
                class="article-content"
                [content]="article.content" />
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleContentTabComponent {
    private readonly pageService = inject(ArticlePageService);
    readonly article = this.pageService.article;
    private readonly document = inject(DOCUMENT);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly injector = inject(Injector);
    private readonly logger = inject(LoggerService).withContext('ArticleContentTab');
    private currentFragment: string | undefined = undefined;

    constructor() {
        this.route.fragment.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(fragment => {
            this.currentFragment = fragment ?? undefined;
            this.scrollToFragment();
        });
    }

    private scrollToFragment(): void {
        afterNextRender(
            () => {
                if (!this.currentFragment || !this.article()) {
                    return;
                }

                let targetElement: Element | undefined = undefined;
                try {
                    targetElement =
                        this.document.getElementById(this.currentFragment) ||
                        this.document.querySelector(`a[name="${CSS.escape(this.currentFragment)}"]`) ||
                        undefined;
                } catch (error) {
                    this.logger.error('scrollToFragment: querySelector failed', { error });
                    return;
                }

                if (!targetElement) {
                    return;
                }

                const mainContainer = this.document.getElementById('content');
                if (mainContainer) {
                    const targetRect = targetElement.getBoundingClientRect();
                    const containerRect = mainContainer.getBoundingClientRect();
                    const scrollTop = targetRect.top - containerRect.top + mainContainer.scrollTop;

                    mainContainer.scrollTo({
                        top: scrollTop,
                        behavior: 'smooth',
                    });
                } else {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                }
            },
            { injector: this.injector }
        );
    }
}
