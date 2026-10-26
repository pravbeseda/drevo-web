import { AI_LOCATE_MODELS, AiLocatedError, AiLocateModel } from '../../../services/ai-review/ai-locate.model';
import { AiLocateService, isAiCheckCategory } from '../../../services/ai-review/ai-locate.service';
import { locateQuote } from '../../helpers/check-report';
import { CheckReportItem, QuoteLocation } from '../../models/check-report.model';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { ButtonComponent } from '@drevo-web/ui/button';
import { TooltipDirective } from '@drevo-web/ui/tooltip';
import { EMPTY, Observable, Subject, catchError, map, mergeMap, of, startWith } from 'rxjs';

interface LocatedError extends AiLocatedError {
    /** Where the quote sits in the card's line; absent when the line does not hold it verbatim. */
    readonly location?: QuoteLocation;
}

type Answer =
    | { readonly status: 'loading' }
    | { readonly status: 'failed' }
    | { readonly status: 'done'; readonly errors: readonly LocatedError[] };

interface ModelAnswer {
    readonly model: AiLocateModel;
    readonly label: string;
    readonly answer: Answer;
}

const MODELS = Object.keys(AI_LOCATE_MODELS) as readonly AiLocateModel[];

/** The Haiku and Luna buttons of an AI card, and the answer of each: where in the paragraph the problem is. */
@Component({
    selector: 'app-ai-locate',
    imports: [ButtonComponent, TooltipDirective],
    templateUrl: './ai-locate.component.html',
    styleUrl: './ai-locate.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiLocateComponent {
    private readonly aiLocate = inject(AiLocateService);
    private readonly logger = inject(LoggerService).withContext('AiLocateComponent');
    private readonly asks = new Subject<AiLocateModel>();
    private readonly _answers = signal<Readonly<Partial<Record<AiLocateModel, Answer>>>>({});

    /** An AI card: it covers its whole source line, so `fragment` is that line. */
    readonly item = input.required<CheckReportItem>();
    /** The line as Jev saw it, the markup stripped. */
    readonly prose = input.required<string>();
    readonly fragmentSelected = output<CheckReportItem>();

    readonly models = MODELS.map(model => ({ model, label: AI_LOCATE_MODELS[model].label }));
    readonly answers = computed((): readonly ModelAnswer[] =>
        MODELS.flatMap(model => {
            const answer = this._answers()[model];
            return answer ? [{ model, label: AI_LOCATE_MODELS[model].label, answer }] : [];
        }),
    );

    constructor() {
        this.asks
            .pipe(
                mergeMap(model => this.answer(model).pipe(map(answer => ({ model, answer })))),
                takeUntilDestroyed(),
            )
            .subscribe(({ model, answer }) => this._answers.update(answers => ({ ...answers, [model]: answer })));
    }

    isLoading(model: AiLocateModel): boolean {
        return this._answers()[model]?.status === 'loading';
    }

    ask(model: AiLocateModel): void {
        this.logger.info('AI locate: asked', { model, line: this.item().line });
        this.asks.next(model);
    }

    select(error: LocatedError): void {
        const item = this.item();
        const location = error.location;
        this.fragmentSelected.emit(
            location
                ? {
                      ...item,
                      from: item.from + location.from,
                      to: item.from + location.to,
                      fragment: error.quote.trim(),
                      contextBefore: location.contextBefore,
                      contextAfter: location.contextAfter,
                  }
                : item,
        );
    }

    private answer(model: AiLocateModel): Observable<Answer> {
        const { category, fragment } = this.item();
        if (!isAiCheckCategory(category)) return EMPTY;

        return this.aiLocate.locate(model, category, this.prose()).pipe(
            map((errors): Answer => ({
                status: 'done',
                errors: errors.map(error => ({ ...error, location: locateQuote(fragment, error.quote) })),
            })),
            catchError(() => of<Answer>({ status: 'failed' })),
            startWith<Answer>({ status: 'loading' }),
        );
    }
}
