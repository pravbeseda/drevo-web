import { TOOLBAR_GROUPS } from '../../components/editor/editor-toolbar.config';
import { russianPhrases } from '../../constants/editor-phrases';
import { insertTagInView } from '../../helpers/insert-tag';
import { continueLists, decreaseListIndent, increaseListIndent } from '../../helpers/list-commands';
import { quoteKeymap } from '../../helpers/quote-commands';
import { WikiHighlighterService } from '../wiki-highlighter/wiki-highlighter.service';
import { isPlatformServer } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { closeBrackets } from '@codemirror/autocomplete';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { openSearchPanel, search, searchKeymap } from '@codemirror/search';
import { EditorState, Extension } from '@codemirror/state';
import { drawSelection, dropCursor, EditorView, highlightSpecialChars, keymap, ViewUpdate } from '@codemirror/view';

@Injectable()
export class EditorFactoryService {
    private changeHandler: (text: string) => void = () => {
        // Should be changed by setChangeHandler
    };

    private readonly wikiHighlighter = inject(WikiHighlighterService);
    private readonly platformId = inject<object>(PLATFORM_ID);

    public isServer(): boolean {
        return isPlatformServer(this.platformId);
    }

    public createState(doc: string, customExtensions: Extension[] = []): EditorState {
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
                    ...TOOLBAR_GROUPS.flatMap(g => g.actions)
                        .filter(a => a.keyBinding)
                        .map(a => ({
                            key: a.keyBinding as string,
                            run: (view: EditorView) => insertTagInView(view, a.command),
                        })),
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...searchKeymap,
                    ...quoteKeymap,
                    { key: 'Mod-f', run: openSearchPanel },
                ]),
                search({
                    scrollToMatch: ({ from }) =>
                        EditorView.scrollIntoView(from, {
                            y: 'start',
                            x: 'nearest',
                        }),
                }),
                ...customExtensions,
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
