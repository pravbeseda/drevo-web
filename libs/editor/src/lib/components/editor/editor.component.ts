import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorView } from '@codemirror/view';
import { WikiHighlighterService } from '../../services/wiki-highlighter/wiki-highlighter.service';
import { linksUpdatedEffect } from '../../constants/editor-effects';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, filter } from 'rxjs';
import { InsertTagCommand } from '@drevo-web/shared';
import { EditorFactoryService } from '../../services/editor-factory/editor-factory.service';

@UntilDestroy()
@Component({
    selector: 'lib-editor',
    imports: [CommonModule],
    providers: [EditorFactoryService, WikiHighlighterService],
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss', 'codemirror-custom.scss'],
})
export class EditorComponent implements OnInit, AfterViewInit {
    private linksSubject = new BehaviorSubject<Record<string, boolean>>({});

    @ViewChild('editorContainer')
    editorContainer?: ElementRef;

    @Input({ required: true })
    content!: string;

    @Input()
    set insertTagCommand(command: InsertTagCommand | null) {
        if (!command) {
            return;
        }
        this.insertTag(command);
    }

    @Output()
    readonly updateLinksEvent = new EventEmitter<string[]>();

    @Output()
    readonly contentChanged = new EventEmitter<string>();

    @Input()
    set linksStatus(links: Record<string, boolean>) {
        this.linksSubject.next(links);

        this.wikiHighlighterService.updateLinksState(links).then(changed => {
            if (changed && this.editor) {
                this.editor.dispatch({
                    effects: linksUpdatedEffect.of(undefined),
                });
            }
        });
    }
    get linksStatus(): Record<string, boolean> {
        return this.linksSubject.getValue();
    }

    private editor?: EditorView;

    constructor(
        private readonly editorFactory: EditorFactoryService,
        private readonly wikiHighlighterService: WikiHighlighterService
    ) {}

    ngOnInit() {
        this.wikiHighlighterService.updateLinks$
            .pipe(
                filter(links => links.length > 0),
                untilDestroyed(this)
            )
            .subscribe(links => {
                this.updateLinksEvent.emit(links);
            });
    }

    ngAfterViewInit(): void {
        if (this.editorFactory.isServer() || !this.editorContainer) return;

        this.editor = new EditorView({
            state: this.editorFactory.createState(this.content),
            parent: this.editorContainer.nativeElement,
        });

        this.editorFactory.setChangeHandler(text =>
            this.contentChanged.emit(text)
        );

        this.editor.contentDOM.setAttribute('spellcheck', 'true');
        this.editor.contentDOM.setAttribute('autocorrect', 'on');
    }

    private insertTag(command: InsertTagCommand): void {
        if (!this.editor) {
            return;
        }

        const view = this.editor;
        const { state } = view;
        const { from, to } = state.selection.main;

        const selectedText =
            from === to ? command.sampleText : state.doc.sliceString(from, to);

        const taggedText = `${command.tagOpen}${selectedText}${command.tagClose}`;

        view.dispatch({
            changes: { from, to, insert: taggedText },
            selection: {
                anchor: from + command.tagOpen.length,
                head: from + command.tagOpen.length + selectedText.length,
            },
        });

        view.focus();
    }
}
