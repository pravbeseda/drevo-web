import { BibleToggleAction } from './actions/bible-toggle.action';
import { CommentToggleAction } from './actions/comment-toggle.action';
import { GroupToggleAction } from './actions/group-toggle.action';
import { MapStubAction } from './actions/map-stub.action';
import { AnchorClickHandler } from './handlers/anchor-click.handler';
import { FootnoteClickHandler } from './handlers/footnote-click.handler';
import { InternalLinkClickHandler } from './handlers/internal-link-click.handler';
import { LegacyActionClickHandler } from './handlers/legacy-action-click.handler';
import { PictureClickHandler } from './handlers/picture-click.handler';
import { WikiClickHandler } from './handlers/wiki-click-handler';
import { resolveFragmentLinks } from './preprocessors/resolve-fragment-links';
import { sanitizeOnclickAttributes } from './preprocessors/sanitize-onclick-attributes';
import { stripMapElements } from './preprocessors/strip-map-elements';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { WINDOW } from '@drevo-web/core';

@Component({
    selector: 'app-wiki-content',
    templateUrl: './wiki-content.component.html',
    styleUrl: './wiki-content.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        LegacyActionClickHandler,
        PictureClickHandler,
        FootnoteClickHandler,
        AnchorClickHandler,
        InternalLinkClickHandler,
        BibleToggleAction,
        CommentToggleAction,
        GroupToggleAction,
        MapStubAction,
    ],
})
export class WikiContentComponent implements OnInit, OnDestroy {
    readonly content = input<string>('');

    protected readonly sanitizedContent = computed(() => {
        let html = this.content();
        html = stripMapElements(html);
        html = sanitizeOnclickAttributes(html);
        html = resolveFragmentLinks(html, this.currentPath());
        return this.sanitizer.bypassSecurityTrustHtml(html);
    });

    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly window = inject(WINDOW);

    private currentPath(): string {
        const location = this.window?.location;
        return location ? `${location.pathname}${location.search}` : '';
    }

    private readonly clickHandlers: readonly WikiClickHandler[] = [
        inject(LegacyActionClickHandler),
        inject(PictureClickHandler),
        inject(FootnoteClickHandler),
        inject(AnchorClickHandler),
        inject(InternalLinkClickHandler),
    ];

    private readonly clickHandler = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;
        const host = this.elementRef.nativeElement;
        for (const handler of this.clickHandlers) {
            if (handler.handleClick(event, target, host)) {
                return;
            }
        }
    };

    ngOnInit(): void {
        this.elementRef.nativeElement.addEventListener('click', this.clickHandler);
    }

    ngOnDestroy(): void {
        this.elementRef.nativeElement.removeEventListener('click', this.clickHandler);
    }
}
