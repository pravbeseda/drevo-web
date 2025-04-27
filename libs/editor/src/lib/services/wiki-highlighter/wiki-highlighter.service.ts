import { Injectable } from '@angular/core';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { RangeSetBuilder, StateField } from '@codemirror/state';
import { linksUpdatedEffect } from '../../constants/editor-effects';
import { Subject } from 'rxjs';

interface Match {
    from: number;
    to: number;
    className: string;
}

const commonClassName = 'cm-wikiHighlight';
const LINK_STATE_RE = /\bcm-link-(pending|exists|missing)\b/;

@Injectable()
export class WikiHighlighterService {
    private readonly footnoteRegex = /\[\[([\s\S]*?)\]\]/g;
    private readonly linkRegex = /\(\((?!\()(.+?)(=.+?)?\)\)(?!\))/g;
    private readonly mapPointRegex = /\{\{Метка:(.+?)\}\}/g;
    private readonly quoteRegex = /^>.*$/gm;

    private text = '';
    private readonly matches: Match[] = [];
    private linksState: Record<string, boolean> = {};
    private readonly pendingLinks: string[] = [];
    private readonly updateLinksSubject = new Subject<string[]>();

    public readonly updateLinks$ = this.updateLinksSubject.asObservable();

    public wikiHighlighter = StateField.define<DecorationSet>({
        create: state => this.createDecorations(state.doc.toString()),
        update: (decorations, transaction) => {
            if (
                transaction.docChanged ||
                transaction.effects.some(eff => eff.is(linksUpdatedEffect))
            ) {
                return this.createDecorations(transaction.newDoc.toString());
            }
            return decorations;
        },
        provide: f => EditorView.decorations.from(f),
    });

    public async updateLinksState(
        updateLinksState: Record<string, boolean>
    ): Promise<boolean> {
        let changed = false;
        this.linksState = { ...this.linksState, ...updateLinksState };
        this.pendingLinks.length = 0;
        if (this.text.length === 0) {
            return Promise.resolve(true);
        }
        for (const match of this.matches) {
            if (LINK_STATE_RE.test(match.className)) {
                const linkText = this.extractLinkText(this.text, match);
                if (linkText) {
                    const status: boolean | undefined =
                        this.linksState[linkText.trim().toUpperCase()];
                    let newClass: string | undefined;
                    if (status === true) {
                        newClass = `${commonClassName} cm-link-exists`;
                    } else if (status === false) {
                        newClass = `${commonClassName} cm-link-missing`;
                    } else {
                        newClass = `${commonClassName} cm-link-pending`;
                        this.pendingLinks.push(linkText);
                    }
                    if (newClass && newClass !== match.className) {
                        match.className = newClass;
                        changed = true;
                    }
                }
            }
        }

        this.requestLinksStatus(this.pendingLinks);

        return changed;
    }

    private requestLinksStatus(links: string[]): void {
        if (!links.length) {
            return;
        }

        this.updateLinksSubject.next(
            Array.from(new Set(links.map(link => link.trim().toUpperCase())))
        );
    }

    private reset(text: string): void {
        this.text = text;
        this.matches.length = 0;
        this.pendingLinks.length = 0;
    }

    private createDecorations(text: string): DecorationSet {
        const textChanged = this.text !== text;
        if (textChanged) {
            this.reset(text);
            this.collectMatches(this.footnoteRegex, 'cm-footnote');
            this.collectMapPointMatches();
            this.collectMatches(this.linkRegex, 'cm-link', true);
            this.collectMatches(this.quoteRegex, 'cm-quote');
            this.collectLinksMatches();
            this.matches.sort((a, b) => a.from - b.from);
            this.updateLinksState(this.linksState);
        }

        return this.buildText();
    }

    private buildText(): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        for (const { from, to, className } of this.matches) {
            builder.add(from, to, Decoration.mark({ class: className }));
        }

        return builder.finish();
    }

    private collectMatches(
        regex: RegExp,
        className: string,
        isBalancedCorrectionNeeded = false
    ): void {
        let match;
        while ((match = regex.exec(this.text)) !== null) {
            let matchedText = match[0];
            if (isBalancedCorrectionNeeded) {
                matchedText = this.trimToBalanced(matchedText);
            }
            this.matches.push({
                from: match.index,
                to: match.index + matchedText.length,
                className: `${commonClassName} ${className}`,
            });
        }
    }

    private collectLinksMatches(): void {
        let match;
        while ((match = this.linkRegex.exec(this.text)) !== null) {
            const matchedText = this.trimToBalanced(match[1]);
            const start = match.index + 2; // Skip the opening brackets
            const isMap = matchedText.startsWith('Карты:');
            const specificClass = isMap ? 'cm-map' : 'cm-link-pending';
            this.matches.push({
                from: start,
                to: start + matchedText.length,
                className: `${commonClassName} ${specificClass}`,
            });
        }
    }

    private collectMapPointMatches(): void {
        let match: RegExpExecArray | null;
        while ((match = this.mapPointRegex.exec(this.text)) !== null) {
            const fullMatch = match[0];
            const start = match.index;
            const end = start + fullMatch.length;
            this.matches.push({
                from: start,
                to: end,
                className: `${commonClassName} cm-map-point`,
            });
        }
    }

    private extractLinkText(doc: string, match: Match): string {
        return doc.slice(match.from, match.to);
    }

    private trimToBalanced(text: string): string {
        let stack = 0;
        let endIndex = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '(') {
                stack++;
            } else if (char === ')') {
                stack--;
            }
            if (stack < 0) {
                break;
            }
            endIndex = i + 1;
        }

        return text.slice(0, endIndex);
    }
}
