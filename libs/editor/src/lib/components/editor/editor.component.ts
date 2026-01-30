import { linksUpdatedEffect } from '../../constants/editor-effects';
import { EditorFactoryService } from '../../services/editor-factory/editor-factory.service';
import { WikiHighlighterService } from '../../services/wiki-highlighter/wiki-highlighter.service';
import {
    AfterViewInit,
    Component,
    DestroyRef,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EditorView } from '@codemirror/view';
import { InsertTagCommand } from '@drevo-web/shared';
import { BehaviorSubject, debounceTime, filter } from 'rxjs';

const LINKS_CHECK_DEBOUNCE_MS = 300;

@Component({
    selector: 'lib-editor',
    imports: [],
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

    private readonly destroyRef = inject(DestroyRef);
    private readonly editorFactory = inject(EditorFactoryService);
    private readonly wikiHighlighterService = inject(WikiHighlighterService);

    ngOnInit() {
        this.wikiHighlighterService.updateLinks$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                filter(links => links.length > 0),
                debounceTime(LINKS_CHECK_DEBOUNCE_MS)
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
