import { AiLocatedError } from '../../../services/ai-review/ai-locate.model';
import { AiLocateService } from '../../../services/ai-review/ai-locate.service';
import { CheckReportItem } from '../../models/check-report.model';
import { createComponentFactory, mockProvider, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AiLocateComponent } from './ai-locate.component';

const LINE = 'Первое. В нём есть ашибка тут.';
const LINE_FROM = 100;
const ITEM: CheckReportItem = {
    from: LINE_FROM,
    to: LINE_FROM + LINE.length,
    message: 'Опечатка',
    ruleId: 'ai-spelling',
    category: 'spelling',
    level: 'serious',
    probability: 0.9,
    fragment: LINE,
    line: 3,
    isChanged: true,
    contextBefore: '',
    contextAfter: '',
};
const TYPO: AiLocatedError = { quote: 'ашибка', suggestion: 'ошибка', explanation: 'Опечатка в корне' };

describe('AiLocateComponent', () => {
    let spectator: Spectator<AiLocateComponent>;
    let locate: SpyObject<AiLocateService>['locate'];

    const createComponent = createComponentFactory({
        component: AiLocateComponent,
        providers: [mockLoggerProvider(), mockProvider(AiLocateService)],
    });

    const answers = (): readonly string[] =>
        spectator
            .queryAll('[data-testid="ai-locate-answer"]')
            .map(el => el.textContent?.replace(/\s+/gu, ' ').trim() ?? '');

    beforeEach(() => {
        spectator = createComponent({ props: { item: ITEM, prose: LINE } });
        locate = spectator.inject(AiLocateService).locate;
    });

    it('asks the chosen model about the card category and highlights what it found', () => {
        locate.mockReturnValue(of([TYPO]));

        spectator.click('[data-testid="ai-locate-haiku"]');

        expect(locate).toHaveBeenCalledWith('haiku', 'spelling', LINE);
        expect(answers()).toEqual(['Haiku:В нём есть ашибка тут. → ошибкаОпечатка в корне']);
        expect(spectator.query('[data-testid="ai-locate-answer"] mark')).toHaveText('ашибка');
    });

    it('shows both answers side by side', () => {
        locate.mockReturnValueOnce(of([TYPO])).mockReturnValueOnce(of([]));

        spectator.click('[data-testid="ai-locate-haiku"]');
        spectator.click('[data-testid="ai-locate-luna"]');

        expect(answers()).toEqual(['Haiku:В нём есть ашибка тут. → ошибкаОпечатка в корне', 'Luna: ошибки нет']);
    });

    it('shows a quote the line does not hold without a highlight', () => {
        locate.mockReturnValue(of([{ quote: 'ошибочка', explanation: 'Опечатка' }]));

        spectator.click('[data-testid="ai-locate-luna"]');

        expect(answers()).toEqual(['Luna: ошибочка Опечатка']);
        expect(spectator.query('[data-testid="ai-locate-answer"] mark')).toBeNull();
    });

    it('selects the located fragment in the text', () => {
        locate.mockReturnValue(of([TYPO]));
        let selected: CheckReportItem | undefined;
        spectator.output('fragmentSelected').subscribe(item => (selected = item));

        spectator.click('[data-testid="ai-locate-haiku"]');
        spectator.click('[data-testid="ai-locate-fragment"]');

        expect(selected).toMatchObject({ from: LINE_FROM + 19, to: LINE_FROM + 25, fragment: 'ашибка' });
    });

    it('selects the whole line for a quote it could not locate', () => {
        locate.mockReturnValue(of([{ quote: 'ошибочка', explanation: 'Опечатка' }]));
        let selected: CheckReportItem | undefined;
        spectator.output('fragmentSelected').subscribe(item => (selected = item));

        spectator.click('[data-testid="ai-locate-haiku"]');
        spectator.click('[data-testid="ai-locate-fragment"]');

        expect(selected).toBe(ITEM);
    });

    it('waits for the answer with the button disabled', () => {
        const pending = new Subject<readonly AiLocatedError[]>();
        locate.mockReturnValue(pending);

        spectator.click('[data-testid="ai-locate-haiku"]');

        expect(answers()).toEqual(['Haiku: проверяет…']);
        expect(spectator.query('[data-testid="ai-locate-haiku"]')).toBeDisabled();
        pending.next([]);
        spectator.detectChanges();
        expect(answers()).toEqual(['Haiku: ошибки нет']);
    });

    it('says it failed and lets the moderator ask again', () => {
        locate.mockReturnValueOnce(throwError(() => new Error('down'))).mockReturnValueOnce(of([]));

        spectator.click('[data-testid="ai-locate-haiku"]');
        expect(answers()).toEqual(['Haiku: не удалось']);

        spectator.click('[data-testid="ai-locate-haiku"]');
        expect(answers()).toEqual(['Haiku: ошибки нет']);
    });
});
