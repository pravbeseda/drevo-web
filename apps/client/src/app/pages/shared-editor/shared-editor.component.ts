import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    inject,
} from '@angular/core';
import { EditorComponent } from '@drevo-web/editor';
import { BehaviorSubject, first, Observable, Subject, map } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { IframeService } from '../../services/iframe/iframe.service';
import { LinksService } from '../../services/links/links.service';
import { HttpClient } from '@angular/common/http';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { InsertTagCommand } from '@drevo-web/shared';

interface EditorConfig {
    content: string;
}

@UntilDestroy()
@Component({
    selector: 'app-shared-editor',
    imports: [EditorComponent, AsyncPipe],
    providers: [HttpClient, IframeService, LinksService],
    templateUrl: './shared-editor.component.html',
    styleUrl: './shared-editor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedEditorComponent implements AfterViewInit {
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
            .pipe(untilDestroyed(this))
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
