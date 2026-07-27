import { linksUpdatedEffect } from '../../constants/editor-effects';
import { Injectable } from '@angular/core';
import { RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { Subject } from 'rxjs';

interface Match {
    from: number;
    to: number;
    className: string;
}

const commonClassName = 'cm-wikiHighlight';
const LINK_STATE_RE = /\bcm-link-(pending|exists|missing)\b/;

interface WikiSpan {
    /** Offset of the opening delimiter. */
    readonly index: number;
    /** The whole span, delimiters included. */
    readonly text: string;
    /** Span content; for links, the part before an `=alias` suffix. */
    readonly content: string;
}

/**
 * Delimited spans are scanned with `indexOf` rather than matched with a regex: the
 * regex form needs a lazy any-run between the delimiters, which degrades quadratically
 * on unclosed delimiters, and this runs on every document change. Bounding the run
 * instead would silently stop highlighting long footnotes and links.
 */
function findFootnoteSpans(text: string): WikiSpan[] {
    const spans: WikiSpan[] = [];
    let cursor = 0;

    for (;;) {
        const start = text.indexOf('[[', cursor);
        if (start === -1) {
            return spans;
        }

        const contentStart = start + 2;
        const end = text.indexOf(']]', contentStart);
        if (end === -1) {
            return spans;
        }

        cursor = end + 2;
        spans.push({ index: start, text: text.slice(start, cursor), content: text.slice(contentStart, end) });
    }
}

/** Link text stops at the first `=` that leaves a non-empty alias behind it. */
function splitLinkContent(content: string): string {
    for (let i = 1; i < content.length - 1; i++) {
        if (content[i] === '=') {
            return content.slice(0, i);
        }
    }
    return content;
}

/** Offset of the first line break at or after `from`, or `undefined` when there is none. */
function findNewline(text: string, from: number): number | undefined {
    const lf = text.indexOf('\n', from);
    const cr = text.indexOf('\r', from);

    if (lf === -1) {
        return cr === -1 ? undefined : cr;
    }
    return cr === -1 ? lf : Math.min(lf, cr);
}

/**
 * Offset of the `))` closing this link, or `undefined` when it has none.
 *
 * Candidates are compared by offset rather than by slicing the content out: a run of
 * `)` yields one failing candidate per character, so copying and rescanning the content
 * each time made this quadratic, and it runs on every document change.
 */
function findLinkEnd(text: string, contentStart: number): number | undefined {
    // Link text cannot span lines, so the first newline rules out every later candidate.
    const newline = findNewline(text, contentStart);
    let end = text.indexOf('))', contentStart);

    while (end !== -1) {
        if (newline !== undefined && newline < end) {
            return undefined;
        }
        // Content must be non-empty, and a third `)` means the closer is further on.
        if (end > contentStart && text[end + 2] !== ')') {
            return end;
        }
        end = text.indexOf('))', end + 1);
    }

    return undefined;
}

function findLinkSpans(text: string): WikiSpan[] {
    const spans: WikiSpan[] = [];
    let searchFrom = 0;

    for (;;) {
        const start = text.indexOf('((', searchFrom);
        if (start === -1) {
            return spans;
        }

        const contentStart = start + 2;
        // A third `(` is not a link opener.
        const end = text[contentStart] === '(' ? undefined : findLinkEnd(text, contentStart);
        if (end === undefined) {
            searchFrom = start + 1;
            continue;
        }

        searchFrom = end + 2;
        spans.push({
            index: start,
            text: text.slice(start, searchFrom),
            content: splitLinkContent(text.slice(contentStart, end)),
        });
    }
}

@Injectable()
export class WikiHighlighterService {
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
            if (transaction.docChanged || transaction.effects.some(eff => eff.is(linksUpdatedEffect))) {
                return this.createDecorations(transaction.newDoc.toString());
            }
            return decorations;
        },
        provide: f => EditorView.decorations.from(f),
    });

    public async updateLinksState(updateLinksState: Record<string, boolean>): Promise<boolean> {
        let changed = false;
        this.linksState = { ...this.linksState, ...updateLinksState };
        this.pendingLinks.length = 0;

        if (this.text.length === 0) {
            return Promise.resolve(true);
        }

        for (const match of this.matches) {
            if (this.applyLinkState(match)) {
                changed = true;
            }
        }

        this.requestLinksStatus(this.pendingLinks);

        return changed;
    }

    private applyLinkState(match: Match): boolean {
        if (!LINK_STATE_RE.test(match.className)) {
            return false;
        }

        const linkText = this.extractLinkText(this.text, match);
        if (!linkText) {
            return false;
        }

        const newClass = this.resolveLinkClass(linkText);
        if (newClass === match.className) {
            return false;
        }

        match.className = newClass;
        return true;
    }

    private resolveLinkClass(linkText: string): string {
        const status: boolean | undefined = this.linksState[this.normalizeLinkText(linkText)];

        if (status === true) {
            return `${commonClassName} cm-link-exists`;
        }
        if (status === false) {
            return `${commonClassName} cm-link-missing`;
        }

        this.pendingLinks.push(linkText);
        return `${commonClassName} cm-link-pending`;
    }

    private requestLinksStatus(links: string[]): void {
        if (!links.length) {
            return;
        }

        const uniqueNormalized = new Set(links.map(link => this.normalizeLinkText(link)));

        this.updateLinksSubject.next(Array.from(uniqueNormalized));
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
            const linkSpans = findLinkSpans(this.text);
            this.collectSpans(findFootnoteSpans(this.text), 'cm-footnote');
            this.collectMapPointMatches();
            this.collectSpans(linkSpans, 'cm-link', true);
            this.collectMatches(this.quoteRegex, 'cm-quote');
            this.collectLinksMatches(linkSpans);
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

    private collectSpans(spans: WikiSpan[], className: string, isBalancedCorrectionNeeded = false): void {
        for (const span of spans) {
            const matchedText = isBalancedCorrectionNeeded ? this.trimToBalanced(span.text) : span.text;
            this.matches.push({
                from: span.index,
                to: span.index + matchedText.length,
                className: `${commonClassName} ${className}`,
            });
        }
    }

    private collectMatches(regex: RegExp, className: string, isBalancedCorrectionNeeded = false): void {
        let match;
        // eslint-disable-next-line no-null/no-null
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

    private collectLinksMatches(spans: WikiSpan[]): void {
        for (const span of spans) {
            const matchedText = this.trimToBalanced(span.content);
            const start = span.index + 2; // Skip the opening brackets
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
        // eslint-disable-next-line no-null/no-null
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

    private normalizeLinkText(link: string): string {
        return link.trim().toUpperCase().replace(/Ё/g, 'Е').replace(/\s+/g, ' ');
    }
}
