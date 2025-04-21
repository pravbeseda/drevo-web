import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { EditorComponent } from '@drevo-web/editor';
import {
    BehaviorSubject,
    first,
    Observable,
    Subject,
    throttleTime,
} from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { IframeService } from '../../services/iframe/iframe.service';
import { LinksService } from '../../services/links/links.service';
import { HttpClient } from '@angular/common/http';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { InsertTagCommand } from '@drevo-web/shared';

const throttleTimeContentUpdateInMs = 300;

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
    private readonly updateLinksStateSubject = new BehaviorSubject<
        Record<string, boolean>
    >({});
    private readonly contentUpdateSubject = new Subject<string>();

    readonly content$: Observable<string>;
    readonly insertTagCommand$: Observable<InsertTagCommand>;
    readonly updateLinksState$ = this.updateLinksStateSubject.asObservable();

    constructor(
        private readonly linkService: LinksService,
        private readonly iframeService: IframeService
    ) {
        this.content$ = this.iframeService.content$;
        this.insertTagCommand$ = this.iframeService.insertTag$;
    }

    ngAfterViewInit(): void {
        this.iframeService.sendMessage({ action: 'editorReady' });

        this.contentUpdateSubject
            .pipe(
                untilDestroyed(this),
                throttleTime(throttleTimeContentUpdateInMs)
            )
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
