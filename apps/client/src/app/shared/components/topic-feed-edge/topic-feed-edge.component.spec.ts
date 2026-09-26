import { TopicFeedEdgeComponent } from './topic-feed-edge.component';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

describe('TopicFeedEdgeComponent', () => {
    let spectator: Spectator<TopicFeedEdgeComponent>;
    let loads: number;

    const createComponent = createComponentFactory({
        component: TopicFeedEdgeComponent,
    });

    const render = (state: 'idle' | 'loading' | 'failed', end: 'previous' | 'next' = 'next'): void => {
        spectator = createComponent({ props: { state, end } });
        loads = 0;
        spectator.output('loadMore').subscribe(() => loads++);
    };

    it('asks for more once the reader scrolls this end into view', () => {
        render('idle', 'previous');

        spectator.triggerEventHandler('[data-testid="topic-load-previous"]', 'uiInView', undefined);

        expect(loads).toBe(1);
    });

    it('shows a spinner, and nothing to watch, while the page is on its way', () => {
        render('loading');

        expect(spectator.query('[data-testid="topic-loading-next"]')).toBeTruthy();
        expect(spectator.query('[data-testid="topic-load-next"]')).toBeNull();
    });

    it('offers a retry after a failure instead of watching the end again', () => {
        render('failed');

        expect(spectator.query('[data-testid="topic-load-next"]')).toBeNull();
        expect(spectator.query('[data-testid="topic-edge-error"]')).toHaveExactTrimmedText('Не удалось загрузить');
    });

    it('asks for the page again on retry', () => {
        render('failed');

        spectator.click('[data-testid="topic-retry-next"]');

        expect(loads).toBe(1);
    });
});
