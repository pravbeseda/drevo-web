import { TopicPlaceholderComponent } from './topic-placeholder.component';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

describe('TopicPlaceholderComponent', () => {
    let spectator: Spectator<TopicPlaceholderComponent>;

    const createComponent = createComponentFactory(TopicPlaceholderComponent);

    it('invites the reader to pick a topic', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="topic-placeholder-hint"]')).toHaveText('Выберите тему');
    });

    it('describes the section when the section has a description', () => {
        spectator = createComponent({ props: { description: 'Общие вопросы' } });

        expect(spectator.query('[data-testid="topic-placeholder-description"]')).toHaveText('Общие вопросы');
    });

    it('renders no description line for a section without one', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="topic-placeholder-description"]')).not.toExist();
    });
});
