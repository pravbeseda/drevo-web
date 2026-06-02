import { PictureLightboxService } from '../../../services/pictures/picture-lightbox.service';
import { DOCUMENT } from '@angular/common';
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
import { Router } from '@angular/router';
import { LoggerService, NotificationService, WINDOW } from '@drevo-web/core';

interface ContentInteractionState {
    commentsExpanded: boolean;
    rusVisible: boolean;
    cslVisible: boolean;
}

@Component({
    selector: 'app-wiki-content',
    templateUrl: './wiki-content.component.html',
    styleUrl: './wiki-content.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WikiContentComponent implements OnInit, OnDestroy {
    readonly content = input<string>('');

    protected readonly sanitizedContent = computed(() => {
        const processed = this.preprocessContent(this.content());
        return this.sanitizer.bypassSecurityTrustHtml(processed);
    });

    private readonly interactionState: ContentInteractionState = {
        commentsExpanded: true,
        rusVisible: true,
        cslVisible: true,
    };

    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly document = inject(DOCUMENT);
    private readonly window = inject(WINDOW);
    private readonly router = inject(Router);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly logger = inject(LoggerService).withContext('WikiContent');
    private readonly notification = inject(NotificationService);
    private readonly pictureLightboxService = inject(PictureLightboxService);

    private readonly clickHandler = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;

        let element: HTMLElement | undefined = target;
        while (element && element !== this.elementRef.nativeElement) {
            const dataOnclick = element.getAttribute('data-onclick');
            if (dataOnclick && this.isJavaScriptProtocol(dataOnclick)) {
                event.preventDefault();
                this.executeJavaScriptAction(dataOnclick);
                return;
            }
            element = element.parentElement ?? undefined;
        }

        if (target.closest('.pic')) {
            const pictureId = this.extractPictureId(target);
            if (pictureId !== undefined) {
                event.preventDefault();
                this.pictureLightboxService.open(pictureId);
                return;
            }
        }

        const anchor = target.closest('a');
        if (!anchor) {
            return;
        }

        const href = anchor.getAttribute('href');
        if (!href) {
            return;
        }

        if (this.isJavaScriptProtocol(href)) {
            event.preventDefault();
            this.executeJavaScriptAction(href);
            return;
        }

        if (this.isAnchorLink(href)) {
            event.preventDefault();
            const anchorId = href.substring(1);
            this.scrollToAnchor(anchorId);
            return;
        }

        if (this.isInternalLink(href)) {
            event.preventDefault();
            this.router.navigateByUrl(href);
        }
    };

    ngOnInit(): void {
        this.elementRef.nativeElement.addEventListener('click', this.clickHandler);
    }

    ngOnDestroy(): void {
        this.elementRef.nativeElement.removeEventListener('click', this.clickHandler);
    }

    private preprocessContent(html: string): string {
        let processed = this.removeMapElements(html);
        processed = processed.replace(/\s+onclick=(["'])(javascript:[\s\S]*?)\1/gi, ' data-onclick=$1$2$1');
        processed = processed.replace(/(\shref=(["']))(\/pictures\/\d+)\.html\2/gi, '$1$3$2');
        return processed;
    }

    private removeMapElements(html: string): string {
        return html.replace(/<(\w+)[^>]*\sclass="map"[^>]*>[\s\S]*?<\/\1>|<\w+[^>]*\sclass="map"[^>]*\/>/gi, '');
    }

    private isInternalLink(href: string): boolean {
        if (!href.startsWith('/')) {
            return false;
        }
        return !href.startsWith('/#');
    }

    private isAnchorLink(href: string): boolean {
        return href.startsWith('#') && href.length > 1;
    }

    private scrollToAnchor(anchorId: string): void {
        const element =
            this.document.getElementById(anchorId) || this.document.querySelector(`[name="${CSS.escape(anchorId)}"]`);

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const url = `${this.window?.location.pathname}${this.window?.location.search}#${anchorId}`;
            this.window?.history.pushState(undefined, '', url);
        }
    }

    private extractPictureId(target: HTMLElement): number | undefined {
        const anchor = target.closest('a');
        const href = anchor?.getAttribute('href');
        if (!href) {
            return undefined;
        }

        const match = /^\/pictures\/(\d+)$/.exec(href);
        if (!match) {
            return undefined;
        }

        return Number(match[1]);
    }

    private isJavaScriptProtocol(value: string): boolean {
        const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
        return (
            normalized.startsWith('javascript:') || normalized.startsWith('data:') || normalized.startsWith('vbscript:')
        );
    }

    private executeJavaScriptAction(value: string): void {
        const matchWithParam = /^javascript:\s*(?:\w+=)?([a-zA-Z]+)\('([a-zA-Z0-9_-]+)'\)(?:;.*)?$/i.exec(value.trim());
        const matchSimple = /^javascript:\s*(?:\w+=)?([a-zA-Z]+)(?:\(\))?(?:;.*)?$/i.exec(value.trim());

        let action: string;
        let param: string | undefined;

        if (matchWithParam) {
            action = matchWithParam[1];
            param = matchWithParam[2];
        } else if (matchSimple) {
            action = matchSimple[1];
        } else {
            this.logger.warn('Invalid javascript action format', { value });
            return;
        }

        switch (action) {
            case 'toggleAll':
                this.toggleAll();
                break;
            case 'toggleRus':
                this.toggleRus();
                break;
            case 'toggleCsl':
                this.toggleCsl();
                break;
            case 'toggleGroup':
                if (param) {
                    this.toggleGroup(param);
                } else {
                    this.logger.warn('toggleGroup requires a class name parameter', { value });
                }
                break;
            case 'toggleYandexMap':
            case 'googleMap':
                this.showNotImplementedYet();
                break;
            default:
                this.logger.warn('Unknown javascript action', {
                    action,
                    value,
                });
        }
    }

    private toggleAll(): void {
        const host = this.elementRef.nativeElement;
        const comments = host.querySelectorAll('.cmnt');
        const links = Array.from(host.querySelectorAll('.LinkComment')) as HTMLElement[];

        const isExpanded = links[0]?.textContent?.trim() === 'Свернуть';

        links.forEach(link => {
            link.textContent = isExpanded ? 'Развернуть' : 'Свернуть';
        });

        comments.forEach((comment: Element) => {
            (comment as HTMLElement).style.display = isExpanded ? 'none' : '';
        });

        this.interactionState.commentsExpanded = !isExpanded;
    }

    private toggleRus(): void {
        const host = this.elementRef.nativeElement;
        const rusElements = Array.from(host.querySelectorAll('.BibleRus')) as HTMLElement[];
        const cslElements = Array.from(host.querySelectorAll('.BibleCsl')) as HTMLElement[];

        const willBeHidden = rusElements[0]?.style.display !== 'none';
        rusElements.forEach(el => {
            el.style.display = willBeHidden ? 'none' : '';
        });

        if (willBeHidden) {
            cslElements.forEach(el => {
                el.style.display = '';
            });
            this.interactionState.cslVisible = true;
        }

        this.interactionState.rusVisible = !willBeHidden;
        this.updateBibleLinks();
    }

    private toggleCsl(): void {
        const host = this.elementRef.nativeElement;
        const cslElements = Array.from(host.querySelectorAll('.BibleCsl')) as HTMLElement[];
        const rusElements = Array.from(host.querySelectorAll('.BibleRus')) as HTMLElement[];

        const willBeHidden = cslElements[0]?.style.display !== 'none';
        cslElements.forEach(el => {
            el.style.display = willBeHidden ? 'none' : '';
        });

        if (willBeHidden) {
            rusElements.forEach(el => {
                el.style.display = '';
            });
            this.interactionState.rusVisible = true;
        }

        this.interactionState.cslVisible = !willBeHidden;
        this.updateBibleLinks();
    }

    private toggleGroup(className: string): void {
        const host = this.elementRef.nativeElement;
        const elements = Array.from(host.querySelectorAll(`.${CSS.escape(className)}`)) as HTMLElement[];

        elements.forEach(el => {
            el.style.display = el.style.display === 'none' ? '' : 'none';
        });
    }

    private updateBibleLinks(): void {
        const host = this.elementRef.nativeElement;
        const rusLinks = Array.from(host.querySelectorAll('.toggleRus')) as HTMLElement[];
        const cslLinks = Array.from(host.querySelectorAll('.toggleCsl')) as HTMLElement[];

        const rusText = this.interactionState.rusVisible ? 'Скрыть русский перевод' : 'Показать русский перевод';
        const cslText = this.interactionState.cslVisible
            ? 'Скрыть церковнославянский перевод'
            : 'Показать церковнославянский перевод';

        rusLinks.forEach(link => {
            link.textContent = rusText;
        });

        cslLinks.forEach(link => {
            link.textContent = cslText;
        });
    }

    private showNotImplementedYet(): void {
        this.notification.info('Функция еще не реализована');
    }
}
