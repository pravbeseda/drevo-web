import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    PLATFORM_ID,
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
import { article1 } from '../mocks/articles';

@Component({
    selector: 'lib-editor',
    imports: [CommonModule],
    providers: [WikiHighlighterService, LinksStateService],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.scss',
})
export class EditorComponent implements AfterViewInit {
    @ViewChild('editorContainer')
    editorContainer?: ElementRef;

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

        const editor = new EditorView({
            state: EditorState.create({
                doc: article1,
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
                    this.wikiHighlighterService.wikiTheme,
                ],
            }),
            parent: this.editorContainer.nativeElement,
        });

        editor.contentDOM.setAttribute('spellcheck', 'true');
        editor.contentDOM.setAttribute('autocorrect', 'on');
    }
}
