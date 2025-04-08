import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    Input,
    OnChanges,
    PLATFORM_ID,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { EditorState } from '@codemirror/state';
import { EditorView } from 'codemirror';
import { drawSelection, dropCursor, highlightSpecialChars, keymap } from '@codemirror/view';
import {
    defaultHighlightStyle,
    indentOnInput,
    bracketMatching,
    syntaxHighlighting,
} from '@codemirror/language';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { closeBrackets } from '@codemirror/autocomplete';
import { WikiHighlighterService } from '../services/wiki-highlighter/wiki-highlighter.service';
import { LinksStateService } from '../services/links-state/links-state.service';
import { linksUpdatedEffect } from '../constants/editor-effects';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
    selector: 'lib-editor',
    imports: [CommonModule],
    providers: [WikiHighlighterService, LinksStateService],
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss', 'codemirror-custom.scss'],
})
export class EditorComponent implements AfterViewInit, OnChanges {
    @ViewChild('editorContainer')
    editorContainer?: ElementRef;

    @Input()
    text = '';

    private editor?: EditorView;

    constructor(
        @Inject(PLATFORM_ID) private readonly platformId: object,
        private readonly wikiHighlighterService: WikiHighlighterService
    ) {}

    ngAfterViewInit(): void {
        if (isPlatformServer(this.platformId)) {
            return;
        }

        if (!this.editorContainer) {
            return;
        }

        this.editor = new EditorView({
            state: EditorState.create({
                doc: this.text,
                extensions: [
                    highlightSpecialChars(),
                    drawSelection(),
                    dropCursor(),
                    syntaxHighlighting(defaultHighlightStyle),
                    indentOnInput(),
                    EditorView.lineWrapping,
                    history(),
                    keymap.of([...defaultKeymap, ...historyKeymap]),
                    closeBrackets(),
                    bracketMatching(),
                    this.wikiHighlighterService.wikiHighlighter,
                ],
            }),
            parent: this.editorContainer.nativeElement,
        });

        this.wikiHighlighterService.linksUpdated$.pipe(untilDestroyed(this)).subscribe(() => {
            this.editor?.dispatch({ effects: linksUpdatedEffect.of(undefined) });
        });

        this.editor.contentDOM.setAttribute('spellcheck', 'true');
        this.editor.contentDOM.setAttribute('autocorrect', 'on');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.editor && changes['text'] && !changes['text'].firstChange) {
            const newText = changes['text'].currentValue;
            const transaction = this.editor.state.update({
                changes: {
                    from: 0,
                    to: this.editor.state.doc.length,
                    insert: newText,
                },
            });
            this.editor.dispatch(transaction);
        }
    }
}
