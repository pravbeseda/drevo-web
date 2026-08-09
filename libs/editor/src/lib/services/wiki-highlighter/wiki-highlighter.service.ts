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
const LINE_BREAK_RE = /[\n\r]/g;

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

/**
 * Offset of the first line break at or after `from`, or `undefined` when there is none.
 *
 * One pattern rather than an `indexOf` per line-break character: a document that uses only
 * `\n` has no `\r` at all, so searching for it separately scanned to the end of the text on
 * every call.
 */
function findNewline(text: string, from: number): number | undefined {
    LINE_BREAK_RE.lastIndex = from;
    const match = LINE_BREAK_RE.exec(text);

    return match ? match.index : undefined;
}

/**
 * Offset of the `))` closing this link, or `undefined` when there is none before `lineEnd`.
 *
 * Scanned character by character rather than with `indexOf`, which takes no upper bound:
 * it would run to the end of the document and only then have its result compared against
 * `lineEnd`, making one call cost the whole remaining text. Candidates are also compared
 * by offset rather than by slicing the content out — a run of `)` yields one failing
 * candidate per character, and this runs on every document change.
 */
function findLinkEnd(text: string, contentStart: number, lineEnd: number): number | undefined {
    for (let end = contentStart; end + 1 < lineEnd; end++) {
        if (text[end] !== ')' || text[end + 1] !== ')') {
            continue;
        }
        // Content must be non-empty, and a third `)` means the closer is further on.
        if (end > contentStart && text[end + 2] !== ')') {
            return end;
        }
    }

    return undefined;
}

function findLinkSpans(text: string): WikiSpan[] {
    const spans: WikiSpan[] = [];
    let searchFrom = 0;
    // Recomputed only once the scan passes it, so locating line breaks costs one pass over
    // the document in total instead of one per opener.
    let lineEnd = findNewline(text, 0) ?? text.length;

    for (;;) {
        const start = text.indexOf('((', searchFrom);
        if (start === -1) {
            return spans;
        }

        if (start >= lineEnd) {
            lineEnd = findNewline(text, start) ?? text.length;
        }

        const contentStart = start + 2;
        // A third `(` is not a link opener, so the next opener starts one character on.
        if (text[contentStart] === '(') {
            searchFrom = start + 1;
            continue;
        }

        const end = findLinkEnd(text, contentStart, lineEnd);
        if (end === undefined) {
            // A later opener on this line would search a strictly smaller range under a
            // stricter non-empty check, so no closer can be found in the rest of the line.
            searchFrom = lineEnd + 1;
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
    // Values are optional: a link the backend has not reported on yet is simply absent.
    private linksState: Record<string, boolean | undefined> = {};
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

    public updateLinksState(updateLinksState: Record<string, boolean | undefined>): boolean {
        let changed = false;
        this.linksState = { ...this.linksState, ...updateLinksState };
        this.pendingLinks.length = 0;

        if (this.text.length === 0) {
            return true;
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
        const status = this.linksState[this.normalizeLinkText(linkText)];

        if (status === undefined) {
            this.pendingLinks.push(linkText);
            return `${commonClassName} cm-link-pending`;
        }

        return status ? `${commonClassName} cm-link-exists` : `${commonClassName} cm-link-missing`;
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
