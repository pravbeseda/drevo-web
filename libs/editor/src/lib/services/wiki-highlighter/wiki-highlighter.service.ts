import { Injectable } from '@angular/core';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { RangeSetBuilder, StateField } from '@codemirror/state';
import { LinksStateService } from '../links-state/links-state.service';

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

    constructor(private linksStateService: LinksStateService) {}

    public wikiTheme = EditorView.theme({
        '.cm-footnote': {
            backgroundColor: '#f0f0f0',
            color: '#888',
        },
        '.cm-link': {
            backgroundColor: '#e0f7fa',
            color: '#007acc',
        },
        '.cm-link-pending': {
            backgroundColor: 'yellow',
        },
        '.cm-link-exists': {
            backgroundColor: 'green',
            color: '#fff',
        },
        '.cm-link-missing': {
            backgroundColor: 'red',
            color: '#fff',
        },
    });

    public wikiHighlighter = StateField.define<DecorationSet>({
        create: state => this.createDecorations(state.doc.toString()),
        update: (decorations, transaction) => {
            if (transaction.docChanged) {
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
        console.log('createDecorations', { text });
        this.reset(text);

        this.collectMatches(this.footnoteRegex, 'cm-footnote');
        this.collectMatches(this.linkRegex, 'cm-link', true);
        this.collectLinksMatches();

        this.matches.sort((a, b) => a.from - b.from);

        this.updateLinkStatuses();

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

    private async updateLinkStatuses(): Promise<void> {
        if (this.links.length) {
            await this.linksStateService.fetchLinkStatuses(this.links);
        }

        for (const match of this.matches) {
            if (match.className === 'cm-link-pending') {
                const linkText = this.extractLinkText(this.text, match);
                console.log('cm-link-pending', { linkText });
                if (linkText) {
                    const status = this.linksStateService.getLinkStatus(linkText);
                    console.log('getLinkStatus', { linkText, status });
                    if (status === true) {
                        match.className = 'cm-link-exists';
                    } else if (status === false) {
                        match.className = 'cm-link-missing';
                    }
                }
            }
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
