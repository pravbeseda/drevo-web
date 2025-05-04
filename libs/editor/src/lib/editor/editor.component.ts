import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Inject,
    Input,
    OnInit,
    Output,
    PLATFORM_ID,
    ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { EditorState } from '@codemirror/state';
import {
    EditorView,
    drawSelection,
    dropCursor,
    highlightSpecialChars,
    keymap,
    ViewUpdate,
} from '@codemirror/view';
import {
    defaultHighlightStyle,
    indentOnInput,
    bracketMatching,
    syntaxHighlighting,
} from '@codemirror/language';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { closeBrackets } from '@codemirror/autocomplete';
import { WikiHighlighterService } from '../services/wiki-highlighter/wiki-highlighter.service';
import { linksUpdatedEffect } from '../constants/editor-effects';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, filter } from 'rxjs';
import { InsertTagCommand } from '@drevo-web/shared';
import { search, searchKeymap, openSearchPanel } from '@codemirror/search';

const russianPhrases = {
    Find: 'Найти',
    Replace: 'Заменить',
    next: 'Следующее',
    previous: 'Предыдущее',
    replace: 'Заменить',
    'replace all': 'Заменить все',
    'by word': 'искать по словам',
    'match case': 'учитывать регистр',
    Close: 'Закрыть',
};

@UntilDestroy()
@Component({
    selector: 'lib-editor',
    imports: [CommonModule],
    providers: [WikiHighlighterService],
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
        @Inject(PLATFORM_ID) private readonly platformId: object,
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
        if (isPlatformServer(this.platformId)) {
            return;
        }

        if (!this.editorContainer) {
            return;
        }

        this.editor = new EditorView({
            state: EditorState.create({
                doc: this.content,
                extensions: [
                    EditorState.phrases.of(russianPhrases),
                    highlightSpecialChars(),
                    drawSelection(),
                    dropCursor(),
                    syntaxHighlighting(defaultHighlightStyle),
                    indentOnInput(),
                    EditorView.lineWrapping,
                    history(),
                    closeBrackets(),
                    bracketMatching(),
                    this.wikiHighlighterService.wikiHighlighter,
                    this.wikiHighlighterService.urlTooltips,
                    EditorView.updateListener.of((v: ViewUpdate) => {
                        if (v.docChanged) {
                            this.contentChanged.emit(v.state.doc.toString());
                        }
                    }),
                    keymap.of([
                        { key: 'Enter', run: continueLists },
                        ...defaultKeymap,
                        ...historyKeymap,
                        ...searchKeymap,
                        { key: 'Mod-f', run: openSearchPanel },
                    ]),
                    search({
                        scrollToMatch: ({ from }) =>
                            EditorView.scrollIntoView(from, {
                                y: 'start',
                                x: 'nearest',
                            }),
                    }),
                ],
            }),
            parent: this.editorContainer.nativeElement,
        });

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

function continueLists(view: EditorView): boolean {
    const { state } = view;
    const { doc } = state;
    const { head } = state.selection.main;

    // Get the current line
    const line = doc.lineAt(head);
    const lineContent = line.text;

    // Check if the line starts with a quote character ">"
    const quoteMatch = lineContent.match(/^>\s*/);

    if (quoteMatch) {
        // Special handling for quote character ">"
        const prefix = quoteMatch[0];
        const remainingContent = lineContent.substring(head - line.from);
        const isCursorAtEndOfLine = head === line.to;

        let insertText;
        const cursorPos = head + 2; // Position after first \n\n

        if (isCursorAtEndOfLine) {
            // If cursor is at the end of line, just insert two lines
            // One empty line and one for cursor
            insertText = '\n\n';
        } else {
            // Format: Empty line + cursor line + empty lines + (optional) remaining text with prefix
            insertText = '\n\n\n\n'; // Four lines: before cursor, cursor line, two empty lines after

            // Add remaining text with prefix
            if (remainingContent.trim().length > 0) {
                insertText += prefix + remainingContent;
            }
        }

        view.dispatch({
            changes: {
                from: head,
                to: head,
                insert: insertText,
            },
            selection: { anchor: cursorPos }, // Place cursor on the second line
        });
        return true;
    }

    // Handling for lists (* and #)
    const listPrefixMatch = lineContent.match(/^([*#]+)(\s*)/);

    if (listPrefixMatch) {
        const symbolPrefix = listPrefixMatch[1]; // Only * and # symbols

        // Form the correct prefix with a guaranteed space
        const correctPrefix = symbolPrefix + ' ';

        // If the line contains only prefix and whitespace, remove the prefix
        if (lineContent.trim() === symbolPrefix.trim()) {
            // Remove prefix and insert an empty line before cursor
            view.dispatch({
                changes: {
                    from: line.from,
                    to: line.to,
                    insert: '\n',
                },
                selection: { anchor: line.from + 1 }, // Position cursor after the empty line
            });
            return true;
        }

        // Insert a new line with the full prefix (guarantee a space)
        view.dispatch({
            changes: {
                from: head,
                to: head,
                insert: '\n' + correctPrefix,
            },
            selection: { anchor: head + 1 + correctPrefix.length },
        });
        return true;
    }

    return false;
}
