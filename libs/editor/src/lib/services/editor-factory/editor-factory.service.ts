import { TOOLBAR_GROUPS, ToolbarAction } from '../../components/editor/editor-toolbar.config';
import { russianPhrases } from '../../constants/editor-phrases';
import { insertTagInView } from '../../helpers/insert-tag';
import { continueLists, decreaseListIndent, increaseListIndent } from '../../helpers/list-commands';
import { quoteKeymap } from '../../helpers/quote-commands';
import { ValidationResult } from '../../validation/models/validation-result.model';
import { wikiLinter, wikiLintGutter, wikiLintKeymap } from '../../validation/wiki-linter';
import { WikiHighlighterService } from '../wiki-highlighter/wiki-highlighter.service';
import { isPlatformServer } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { closeBrackets } from '@codemirror/autocomplete';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { forEachDiagnostic, setDiagnosticsEffect } from '@codemirror/lint';
import { openSearchPanel, search, searchKeymap } from '@codemirror/search';
import { EditorState, Extension } from '@codemirror/state';
import { drawSelection, dropCursor, EditorView, highlightSpecialChars, keymap, ViewUpdate } from '@codemirror/view';

@Injectable()
export class EditorFactoryService {
    private changeHandler: (text: string) => void = () => {
        // Should be changed by setChangeHandler
    };

    private validationHandler?: (result: ValidationResult) => void;

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
                wikiLinter,
                wikiLintGutter,
                wikiLintKeymap,
                // listener
                EditorView.updateListener.of((v: ViewUpdate) => {
                    if (v.docChanged) {
                        this.onContentChanged(v.state.doc.toString());
                    }
                    const hasLintUpdate = v.transactions.some(tr =>
                        tr.effects.some(e => e.is(setDiagnosticsEffect)),
                    );
                    if (hasLintUpdate) {
                        let errors = 0;
                        let warnings = 0;
                        forEachDiagnostic(v.state, d => {
                            if (d.severity === 'error') errors++;
                            else if (d.severity === 'warning') warnings++;
                        });
                        this.validationHandler?.({ errors, warnings });
                    }
                }),
                keymap.of([
                    { key: 'Enter', run: continueLists },
                    { key: 'Tab', run: increaseListIndent },
                    { key: 'Shift-Tab', run: decreaseListIndent },
                    ...TOOLBAR_GROUPS.flatMap(g => g.actions)
                        .filter((a): a is ToolbarAction & { readonly keyBinding: string } => !!a.keyBinding)
                        .map(a => ({
                            key: a.keyBinding,
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

    public setValidationHandler(handler: (result: ValidationResult) => void): void {
        this.validationHandler = handler;
    }

    private onContentChanged = (text: string) => {
        this.changeHandler(text);
    };
}
