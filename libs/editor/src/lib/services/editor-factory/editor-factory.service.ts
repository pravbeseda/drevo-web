import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { WikiHighlighterService } from '../wiki-highlighter/wiki-highlighter.service';
import { isPlatformServer } from '@angular/common';
import { EditorState } from '@codemirror/state';
import { russianPhrases } from '../../constants/editor-phrases';
import {
    drawSelection,
    dropCursor,
    EditorView,
    highlightSpecialChars,
    keymap,
    ViewUpdate,
} from '@codemirror/view';
import {
    bracketMatching,
    defaultHighlightStyle,
    indentOnInput,
    syntaxHighlighting,
} from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
import { openSearchPanel, search, searchKeymap } from '@codemirror/search';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import {
    continueLists,
    decreaseListIndent,
    increaseListIndent,
} from '../../helpers/list-commands';

@Injectable()
export class EditorFactoryService {
    private changeHandler: (text: string) => void = () => {
        // Should be changed by setChangeHandler
    };

    constructor(
        private wikiHighlighter: WikiHighlighterService,
        @Inject(PLATFORM_ID) private platformId: object
    ) {}

    public isServer(): boolean {
        return isPlatformServer(this.platformId);
    }

    public createState(doc: string): EditorState {
        return EditorState.create({
            doc,
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
                this.wikiHighlighter.wikiHighlighter,
                // listener
                EditorView.updateListener.of((v: ViewUpdate) => {
                    if (v.docChanged) {
                        this.onContentChanged(v.state.doc.toString());
                    }
                }),
                keymap.of([
                    { key: 'Enter', run: continueLists },
                    { key: 'Tab', run: increaseListIndent },
                    { key: 'Shift-Tab', run: decreaseListIndent },
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
        });
    }

    public setChangeHandler(handler: (text: string) => void): void {
        this.changeHandler = handler;
    }

    private onContentChanged = (text: string) => {
        this.changeHandler(text);
    };
}
