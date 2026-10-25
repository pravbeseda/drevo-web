import { AiKeyService } from '../../../services/ai-review/ai-key.service';
import { AiReviewProgress, AiReviewService } from '../../../services/ai-review/ai-review.service';
import { ClipboardService } from '../../../services/clipboard/clipboard.service';
import { CheckReport, CheckReportItem } from '../../models/check-report.model';
import { signal } from '@angular/core';
import { createComponentFactory, mockProvider, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NotificationService } from '@drevo-web/core';
import { CheckFinding } from '@drevo-web/editor';
import { EMPTY, of, Subject } from 'rxjs';
import { ModerationCheckComponent } from './moderation-check.component';

const PREVIOUS = 'Старая строка, ихний дом.';
const CURRENT = 'Старая строка, ихний дом.\nНовая строка, ихнего сына (без пары.';

const aiKeySignal = signal<string | undefined>(undefined);

describe('ModerationCheckComponent', () => {
    let spectator: Spectator<ModerationCheckComponent>;
    let clipboard: SpyObject<ClipboardService>;
    let notification: SpyObject<NotificationService>;
    let aiKey: SpyObject<AiKeyService>;
    let aiReview: SpyObject<AiReviewService>;

    const createComponent = createComponentFactory({
        component: ModerationCheckComponent,
        providers: [
            mockLoggerProvider(),
            mockProvider(ClipboardService),
            mockProvider(NotificationService),
            mockProvider(AiKeyService, { key: aiKeySignal.asReadonly() }),
            mockProvider(AiReviewService, { review: jest.fn(() => EMPTY) }),
        ],
        detectChanges: false,
    });

    const items = (): readonly string[] =>
        spectator.queryAll('[data-testid="moderation-check-item"]').map(el => el.textContent ?? '');

    beforeEach(() => {
        aiKeySignal.set(undefined);
        spectator = createComponent({ props: { texts: { current: CURRENT, previous: PREVIOUS } } });
        clipboard = spectator.inject(ClipboardService);
        notification = spectator.inject(NotificationService);
        aiKey = spectator.inject(AiKeyService);
        aiReview = spectator.inject(AiReviewService);
        clipboard.copy.mockReturnValue(of(undefined));
        spectator.detectChanges();
    });

    it('shows the version as not checked before a run', () => {
        expect(spectator.query('[data-testid="moderation-check-verdict"]')).toHaveText('Не проверено');
        expect(items()).toEqual([]);
    });

    it('checks the whole text and shows the verdict and the cards', () => {
        spectator.click('[data-testid="moderation-check-full"]');

        expect(spectator.query('[data-testid="moderation-check-verdict"]')).toHaveText('Серьёзные замечания');
        expect(items()).toHaveLength(3);
        expect(items()[0]).toContain('Старая строка, ихний дом.');
        expect(items()[0]).toContain('→ их');
    });

    it('checks only the lines this version changed', () => {
        spectator.click('[data-testid="moderation-check-changes"]');

        expect(items()).toHaveLength(2);
        expect(items().every(text => text.includes('строка 2'))).toBe(true);
    });

    it('checks the whole text of a first version, which has no previous one', () => {
        spectator.setInput('texts', { current: CURRENT, previous: undefined });
        spectator.click('[data-testid="moderation-check-changes"]');

        expect(items()).toHaveLength(3);
    });

    it('reports each run', () => {
        const reports: CheckReport[] = [];
        spectator.output('reportChanged').subscribe(report => reports.push(report));

        spectator.click('[data-testid="moderation-check-full"]');
        spectator.click('[data-testid="moderation-check-changes"]');

        expect(reports.map(report => report.items.length)).toEqual([3, 2]);
    });

    it('drops the report when the texts change', () => {
        spectator.click('[data-testid="moderation-check-full"]');

        spectator.setInput('texts', { current: 'Чистый текст.', previous: undefined });
        spectator.detectChanges();

        expect(spectator.query('[data-testid="moderation-check-verdict"]')).toHaveText('Не проверено');
        expect(items()).toEqual([]);
    });

    it('asks to show a finding in the text', () => {
        const selected: CheckReportItem[] = [];
        spectator.output('findingSelected').subscribe(item => selected.push(item));
        spectator.click('[data-testid="moderation-check-full"]');

        spectator.click('[data-testid="moderation-check-show"]');

        expect(selected.map(item => item.fragment)).toEqual(['ихний']);
    });

    it('adds one finding to the comment and marks its card', () => {
        const emitted: (readonly string[])[] = [];
        spectator.output('commentLinesAdded').subscribe(lines => emitted.push(lines));
        spectator.click('[data-testid="moderation-check-full"]');

        spectator.click('[data-testid="moderation-check-add"]');

        expect(emitted).toEqual([['Строка 1: «ихний» → «их» — «Ихний» — просторечие, правильно «их»']]);
        expect(spectator.query('[data-testid="moderation-check-add"]')).toHaveText('В комментарии');
    });

    it('adds the findings not yet added when all go to the comment', () => {
        const emitted: (readonly string[])[] = [];
        spectator.output('commentLinesAdded').subscribe(lines => emitted.push(lines));
        spectator.click('[data-testid="moderation-check-full"]');
        spectator.click('[data-testid="moderation-check-add"]');

        spectator.click('[data-testid="moderation-check-add-all"]');

        expect(emitted[1]).toHaveLength(2);
        expect(emitted[1][1]).toBe('Строка 2: «(» — Нет закрывающей скобки )');
    });

    it('copies a finding', () => {
        spectator.click('[data-testid="moderation-check-full"]');

        spectator.click('[data-testid="moderation-check-copy"]');

        expect(clipboard.copy).toHaveBeenCalledWith('Строка 1: «ихний» → «их» — «Ихний» — просторечие, правильно «их»');
        expect(notification.success).toHaveBeenCalledWith('Замечание скопировано');
    });

    describe('AI review', () => {
        // Line 2 of CURRENT: «Новая строка, ихнего сына (без пары.» starts at offset 26.
        const AI_FINDING: CheckFinding = {
            from: 26,
            to: 62,
            ruleId: 'ai-grammar',
            category: 'grammar',
            level: 'serious',
            message: 'Нарушено согласование — род, число или падеж',
            probability: 0.82,
        };
        const progress = (done: number, failed = 0): AiReviewProgress => ({
            done,
            total: 2,
            failed,
            findings: done > 0 ? [AI_FINDING] : [],
        });

        let answers: Subject<AiReviewProgress>;

        const withKey = (): void => {
            aiKeySignal.set('sk-or-key');
            answers = new Subject<AiReviewProgress>();
            aiReview.review.mockReturnValue(answers);
            spectator.detectChanges();
        };

        const aiItem = (): string => items().find(text => text.includes('ИИ')) ?? '';

        it('offers to connect the AI when there is no key, and asks nothing on a run', () => {
            expect(spectator.query('[data-testid="moderation-check-ai-toggle"]')).toHaveText('Подключить ИИ');

            spectator.click('[data-testid="moderation-check-full"]');

            expect(aiReview.review).not.toHaveBeenCalled();
            expect(spectator.query('[data-testid="moderation-check-ai-progress"]')).toBeNull();
        });

        it('saves the key typed into the key form and closes it', () => {
            spectator.click('[data-testid="moderation-check-ai-toggle"]');
            spectator.typeInElement('sk-or-new', '[data-testid="moderation-check-ai-key"] input');

            spectator.click('[data-testid="moderation-check-ai-save"]');

            expect(aiKey.save).toHaveBeenCalledWith('sk-or-new');
            expect(spectator.query('[data-testid="moderation-check-ai-key"]')).toBeNull();
        });

        it('removes a saved key', () => {
            withKey();
            expect(spectator.query('[data-testid="moderation-check-ai-toggle"]')).toHaveText('ИИ');

            spectator.click('[data-testid="moderation-check-ai-toggle"]');
            spectator.click('[data-testid="moderation-check-ai-remove"]');

            expect(aiKey.remove).toHaveBeenCalled();
        });

        it('asks the AI about the lines in scope and shows its progress', () => {
            withKey();

            spectator.click('[data-testid="moderation-check-changes"]');
            answers.next(progress(0));
            spectator.detectChanges();

            expect(aiReview.review).toHaveBeenCalledWith([
                { line: 2, from: 26, to: 62, text: 'Новая строка, ихнего сына (без пары.' },
            ]);
            expect(spectator.query('[data-testid="moderation-check-ai-progress"]')).toHaveText('ИИ: 0 из 2');
        });

        it('merges the AI findings into the cards and the verdict as they arrive', () => {
            withKey();
            const reports: CheckReport[] = [];
            spectator.output('reportChanged').subscribe(report => reports.push(report));

            spectator.click('[data-testid="moderation-check-full"]');
            answers.next(progress(1));
            spectator.detectChanges();

            expect(reports.map(report => report.items.length)).toEqual([3, 4]);
            expect(aiItem()).toContain('ИИ · 82 %');
            expect(aiItem()).toContain('Грамматика');
            expect(aiItem()).toContain('Нарушено согласование');
        });

        it('shows how many paragraphs failed', () => {
            withKey();

            spectator.click('[data-testid="moderation-check-full"]');
            answers.next(progress(2, 1));
            spectator.detectChanges();

            expect(spectator.query('[data-testid="moderation-check-ai-progress"]')).toHaveText(
                'ИИ: 2 из 2, 1 с ошибкой',
            );
        });

        it('adds an AI finding to the comment by its line, and keeps it added as answers arrive', () => {
            withKey();
            const emitted: (readonly string[])[] = [];
            spectator.output('commentLinesAdded').subscribe(lines => emitted.push(lines));
            spectator.click('[data-testid="moderation-check-full"]');
            answers.next(progress(1));
            spectator.detectChanges();

            const aiCard = spectator
                .queryAll('[data-testid="moderation-check-item"]')
                .find(el => el.textContent?.includes('ИИ'));
            spectator.click(aiCard?.querySelector('[data-testid="moderation-check-add"]') ?? '');
            answers.next(progress(2));
            spectator.detectChanges();

            expect(emitted).toEqual([['Строка 2 — Нарушено согласование — род, число или падеж']]);
            expect(aiItem()).toContain('В комментарии');
        });

        it('drops the previous AI run when a new one starts', () => {
            withKey();
            spectator.click('[data-testid="moderation-check-full"]');
            const first = answers;
            expect(first.observed).toBe(true);
            answers = new Subject<AiReviewProgress>();
            aiReview.review.mockReturnValue(answers);

            spectator.click('[data-testid="moderation-check-changes"]');

            expect(first.observed).toBe(false);
        });
    });
});
