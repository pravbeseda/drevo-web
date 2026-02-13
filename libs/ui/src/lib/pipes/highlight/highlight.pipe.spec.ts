import { createPipeFactory, SpectatorPipe } from '@ngneat/spectator/jest';
import { HighlightPipe } from './highlight.pipe';

describe('HighlightPipe', () => {
    let spectator: SpectatorPipe<HighlightPipe>;
    const createPipe = createPipeFactory(HighlightPipe);

    it('should highlight matching text', () => {
        spectator = createPipe(`<span [innerHTML]="'This is a test string' | highlight:'test'"></span>`);

        expect(spectator.element.innerHTML).toContain('<mark class="highlighted-text">test</mark>');
    });

    it('should highlight multiple occurrences', () => {
        spectator = createPipe(`<span [innerHTML]="'test one test two test' | highlight:'test'"></span>`);

        expect(spectator.element.innerHTML).toContain(
            '<mark class="highlighted-text">test</mark> one <mark class="highlighted-text">test</mark> two <mark class="highlighted-text">test</mark>'
        );
    });

    it('should be case insensitive', () => {
        spectator = createPipe(`<span [innerHTML]="'This is a test string' | highlight:'TEST'"></span>`);

        expect(spectator.element.innerHTML).toContain('<mark class="highlighted-text">test</mark>');
    });

    it('should preserve original case in highlighted text', () => {
        spectator = createPipe(`<span [innerHTML]="'TEST Test test' | highlight:'test'"></span>`);

        expect(spectator.element.innerHTML).toContain('<mark class="highlighted-text">TEST</mark>');
        expect(spectator.element.innerHTML).toContain('<mark class="highlighted-text">Test</mark>');
    });

    it('should not modify text when search is empty', () => {
        spectator = createPipe(`<span [innerHTML]="'Original text' | highlight:''"></span>`);

        expect(spectator.element.textContent).toBe('Original text');
        expect(spectator.element.innerHTML).not.toContain('highlighted-text');
    });

    it('should escape regex special characters in search term', () => {
        spectator = createPipe(`<span [innerHTML]="'This has (test) in it' | highlight:'(test)'"></span>`);

        expect(spectator.element.innerHTML).toContain('<mark class="highlighted-text">(test)</mark>');
    });

    it('should handle text with no matches', () => {
        spectator = createPipe(`<span [innerHTML]="'No match here' | highlight:'xyz'"></span>`);

        expect(spectator.element.textContent).toBe('No match here');
        expect(spectator.element.innerHTML).not.toContain('highlighted-text');
    });

    it('should return empty string for null input', () => {
        spectator = createPipe(`<span [innerHTML]="null | highlight:'test'"></span>`);

        expect(spectator.element.textContent).toBe('');
    });

    it('should return empty string for undefined input', () => {
        spectator = createPipe(`<span [innerHTML]="undefined | highlight:'test'"></span>`);

        expect(spectator.element.textContent).toBe('');
    });

    it('should handle whitespace in search term', () => {
        spectator = createPipe(`<span [innerHTML]="'test content' | highlight:'   '"></span>`);

        expect(spectator.element.textContent).toBe('test content');
        expect(spectator.element.innerHTML).not.toContain('highlighted-text');
    });

    it('should escape HTML in text to prevent XSS', () => {
        spectator = createPipe(`<span [innerHTML]="'<script>alert(1)</script>' | highlight:'script'"></span>`);

        // Text should be escaped, not executed
        expect(spectator.element.textContent).toContain('<script>');
        expect(spectator.element.innerHTML).toContain('&lt;');
        expect(spectator.element.innerHTML).toContain('&gt;');
    });

    it('should handle HTML special characters in search term', () => {
        spectator = createPipe(`<span [innerHTML]="'a < b & c > d' | highlight:'<'"></span>`);

        expect(spectator.element.innerHTML).toContain('<mark class="highlighted-text">&lt;</mark>');
    });
});
