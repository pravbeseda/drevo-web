import { ClipboardService } from '../../../services/clipboard/clipboard.service';
import { CheckReport, CheckReportItem } from '../../models/check-report.model';
import { createComponentFactory, mockProvider, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NotificationService } from '@drevo-web/core';
import { of } from 'rxjs';
import { ModerationCheckComponent } from './moderation-check.component';

const PREVIOUS = 'Старая строка, ихний дом.';
const CURRENT = 'Старая строка, ихний дом.\nНовая строка, ихнего сына (без пары.';

describe('ModerationCheckComponent', () => {
    let spectator: Spectator<ModerationCheckComponent>;
    let clipboard: SpyObject<ClipboardService>;
    let notification: SpyObject<NotificationService>;

    const createComponent = createComponentFactory({
        component: ModerationCheckComponent,
        providers: [mockLoggerProvider(), mockProvider(ClipboardService), mockProvider(NotificationService)],
        detectChanges: false,
    });

    const items = (): readonly string[] =>
        spectator.queryAll('[data-testid="moderation-check-item"]').map(el => el.textContent ?? '');

    beforeEach(() => {
        spectator = createComponent({ props: { texts: { current: CURRENT, previous: PREVIOUS } } });
        clipboard = spectator.inject(ClipboardService);
        notification = spectator.inject(NotificationService);
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
});
