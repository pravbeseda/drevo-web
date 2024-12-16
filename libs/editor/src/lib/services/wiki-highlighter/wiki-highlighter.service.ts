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

    private createDecorations(text: string): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const matches: Match[] = [];
        const links: string[] = [];

        this.collectMatches(text, this.footnoteRegex, 'cm-footnote', matches);
        this.collectMatches(text, this.linkRegex, 'cm-link', matches, true);
        this.collectLinksMatches(text, matches, links);

        matches.sort((a, b) => a.from - b.from);

        for (const { from, to, className } of matches) {
            builder.add(from, to, Decoration.mark({ class: className }));
        }

        this.updateLinkStatuses(links, matches);

        return builder.finish();
    }

    private collectMatches(
        text: string,
        regex: RegExp,
        className: string,
        matches: Match[],
        isBalancedCorrectionNeeded = false
    ): void {
        let match;
        while ((match = regex.exec(text)) !== null) {
            let matchedText = match[0];
            if (isBalancedCorrectionNeeded) {
                matchedText = this.trimToBalanced(matchedText);
            }
            matches.push({
                from: match.index,
                to: match.index + matchedText.length,
                className,
            });
        }
    }

    private collectLinksMatches(text: string, matches: Match[], links: string[]): void {
        let match;
        while ((match = this.linkRegex.exec(text)) !== null) {
            const matchedText = this.trimToBalanced(match[1]);
            const start = match.index + 2; // Skip the opening brackets
            matches.push({
                from: start,
                to: start + matchedText.length,
                className: 'cm-link-pending',
            });
            if (this.linksStateService.getLinkStatus(matchedText) === undefined) {
                links.push(matchedText);
            }
        }
    }

    private async updateLinkStatuses(links: string[], matches: Match[]): Promise<void> {
        if (links.length === 0) return;

        await this.linksStateService.fetchLinkStatuses(links);

        for (const match of matches) {
            if (match.className === 'cm-link-pending') {
                const linkText = this.extractLinkText(match);
                if (linkText) {
                    const status = this.linksStateService.getLinkStatus(linkText);
                    if (status === true) {
                        match.className = 'cm-link-exists';
                    } else if (status === false) {
                        match.className = 'cm-link-missing';
                    }
                }
            }
        }
    }

    private extractLinkText(match: Match): string | null {
        const linkMatch = this.linkRegex.exec(match.className);
        return linkMatch ? linkMatch[1] : null;
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
