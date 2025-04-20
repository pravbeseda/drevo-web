import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { EditorComponent } from '@drevo-web/editor';
import { BehaviorSubject, first, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { IframeService } from '../../services/iframe/iframe.service';
import { LinksService } from '../../services/links/links.service';
import { HttpClient } from '@angular/common/http';

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
    // private content = '';

    readonly content$: Observable<string>;
    readonly updateLinksState$ = this.updateLinksStateSubject.asObservable();

    constructor(
        private readonly linkService: LinksService,
        private readonly iframeService: IframeService
    ) {
        this.content$ = this.iframeService.content$;
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

    contentChanged(content: string) {
        // this.content = content;
    }
}
