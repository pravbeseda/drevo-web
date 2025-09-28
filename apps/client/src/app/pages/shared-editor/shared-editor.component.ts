import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { EditorComponent } from '@drevo-web/editor';
import { BehaviorSubject, first, Observable, Subject, map } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { IframeService } from '../../services/iframe/iframe.service';
import { LinksService } from '../../services/links/links.service';
import { HttpClient } from '@angular/common/http';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { InsertTagCommand } from '@drevo-web/shared';
import { VersionService } from '../../services/version/version.service';

interface EditorConfig {
    content: string;
}

@UntilDestroy()
@Component({
    selector: 'app-shared-editor',
    imports: [EditorComponent, AsyncPipe, NgIf],
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

    readonly editorConfig$: Observable<EditorConfig>;
    readonly insertTagCommand$: Observable<InsertTagCommand>;
    readonly updateLinksState$ = this.updateLinksStateSubject.asObservable();

    constructor(
        private readonly linkService: LinksService,
        private readonly iframeService: IframeService,
        private readonly versionService: VersionService
    ) {
        this.editorConfig$ = this.iframeService.content$.pipe(
            map(content => ({
                content,
            }))
        );
        this.insertTagCommand$ = this.iframeService.insertTag$;
    }

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

        const version = this.versionService.getVersion();
        console.log('Version:', version);
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
