import { Injectable } from '@angular/core';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { RangeSetBuilder, StateField } from '@codemirror/state';
import { LinksStateService } from '../links-state/links-state.service';
import { Subject } from 'rxjs';
import { linksUpdatedEffect } from '../../constants/editor-effects';

interface Match {
    from: number;
    to: number;
    className: string;
}

@Injectable()
export class WikiHighlighterService {
    private footnoteRegex = /\[\[([\s\S]*?)\]\]/g;
    private linkRegex = /\(\((?!\()(.+?)(=.+?)?\)\)(?!\))/g;

    private text = '';
    private matches: Match[] = [];
    private links: string[] = [];

    private readonly linksUpdatedSubject = new Subject<void>();
    readonly linksUpdated$ = this.linksUpdatedSubject.asObservable();

    constructor(private linksStateService: LinksStateService) {}

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

    private reset(text: string): void {
        this.text = text;
        this.matches = [];
        this.links = [];
    }

    private createDecorations(text: string): DecorationSet {
        const textChanged = this.text !== text;
        if (textChanged) {
            this.reset(text);
            this.collectMatches(this.footnoteRegex, 'cm-footnote');
            this.collectMatches(this.linkRegex, 'cm-link', true);
            this.collectLinksMatches();
            this.matches.sort((a, b) => a.from - b.from);
        }

        this.updateLinkStatuses().then(changed => {
            if (changed) {
                this.linksUpdatedSubject.next();
            }
        });

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
                className,
            });
        }
    }

    private collectLinksMatches(): void {
        let match;
        while ((match = this.linkRegex.exec(this.text)) !== null) {
            const matchedText = this.trimToBalanced(match[1]);
            const start = match.index + 2; // Skip the opening brackets
            this.matches.push({
                from: start,
                to: start + matchedText.length,
                className: 'cm-link-pending',
            });
            if (this.linksStateService.getLinkStatus(matchedText) === undefined) {
                this.links.push(matchedText);
            }
        }
    }

    private async updateLinkStatuses(): Promise<boolean> {
        let changed = false;
        if (this.links.length) {
            await this.linksStateService.fetchLinkStatuses(this.links);
        }

        for (const match of this.matches) {
            if (match.className === 'cm-link-pending') {
                const linkText = this.extractLinkText(this.text, match);
                console.log('cm-link-pending', { linkText });
                if (linkText) {
                    const status = this.linksStateService.getLinkStatus(linkText);
                    let newClass: string | undefined;
                    console.log('getLinkStatus', { linkText, status });
                    if (status === true) {
                        newClass = 'cm-link-exists';
                    } else if (status === false) {
                        newClass = 'cm-link-missing';
                    }

                    if (newClass && newClass !== match.className) {
                        match.className = newClass;
                        changed = true;
                    }
                }
            }
        }

        return changed;
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
