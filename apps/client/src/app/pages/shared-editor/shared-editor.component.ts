import { IframeService } from '../../services/iframe/iframe.service';
import { LinksService } from '../../services/links/links.service';
import { AsyncPipe } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EditorComponent } from '@drevo-web/editor';
import { InsertTagCommand } from '@drevo-web/shared';
import { BehaviorSubject, first, Observable, Subject, map } from 'rxjs';

interface EditorConfig {
    content: string;
}

@Component({
    selector: 'app-shared-editor',
    imports: [EditorComponent, AsyncPipe],
    providers: [IframeService, LinksService],
    templateUrl: './shared-editor.component.html',
    styleUrl: './shared-editor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedEditorComponent implements AfterViewInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly linkService = inject(LinksService);
    private readonly iframeService = inject(IframeService);
    private readonly updateLinksStateSubject = new BehaviorSubject<
        Record<string, boolean>
    >({});
    private readonly contentUpdateSubject = new Subject<string>();

    readonly editorConfig$: Observable<EditorConfig> =
        this.iframeService.content$.pipe(
            map(content => ({
                content,
            }))
        );
    readonly insertTagCommand$: Observable<InsertTagCommand> =
        this.iframeService.insertTag$;
    readonly updateLinksState$ = this.updateLinksStateSubject.asObservable();

    ngAfterViewInit(): void {
        this.iframeService.sendMessage({ action: 'editorReady' });

        this.contentUpdateSubject
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(content => {
                this.iframeService.sendMessage({
                    action: 'contentChanged',
                    content,
                });
            });
    }

    updateLinks(links: string[]): void {
        this.linkService
            .getLinkStatuses(links)
            .pipe(first())
            .subscribe(linksState => {
                this.updateLinksStateSubject.next(linksState);
            });
    }

    contentChanged(content: string) {
        this.contentUpdateSubject.next(content);
    }
}
