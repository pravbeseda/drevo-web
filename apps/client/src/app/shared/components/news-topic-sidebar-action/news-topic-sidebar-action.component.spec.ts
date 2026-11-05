import { NewsTopicSidebarActionComponent } from './news-topic-sidebar-action.component';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { SidebarService } from '@drevo-web/core';
import { NewsTopic } from '@drevo-web/shared';
import { CheckboxComponent } from '@drevo-web/ui/checkbox';
import { SidePanelComponent } from '@drevo-web/ui/side-panel';
import { Spectator, createComponentFactory, mockProvider } from '@ngneat/spectator/jest';

describe('NewsTopicSidebarActionComponent', () => {
    let spectator: Spectator<NewsTopicSidebarActionComponent>;
    let picked: number[];

    const topics: readonly NewsTopic[] = [
        { id: 3, title: 'Церковь' },
        { id: 5, title: 'Общество' },
    ];

    const createComponent = createComponentFactory({
        component: NewsTopicSidebarActionComponent,
        providers: [mockProvider(SidebarService)],
        detectChanges: false,
    });

    const render = (selected: number | undefined): void => {
        spectator = createComponent({ props: { topics, selected } });
        picked = [];
        spectator.output('picked').subscribe(id => picked.push(id));
        spectator.detectChanges();
    };

    const action = (): SidebarActionComponent | null => spectator.query(SidebarActionComponent);
    const panel = (): SidePanelComponent | null => spectator.query(SidePanelComponent);
    const checkboxes = (): CheckboxComponent[] => spectator.queryAll(CheckboxComponent);

    it('asks for a section while none is picked, as the main action', () => {
        render(undefined);

        expect(action()?.label()).toBe('Укажите раздел');
        expect(action()?.priority()).toBe('primary');
    });

    it('names the picked section', () => {
        render(5);

        expect(action()?.label()).toBe('Общество');
        expect(action()?.priority()).toBe('secondary');
    });

    it('opens a panel of every section, the picked one ticked', () => {
        render(5);

        action()?.activated.emit();
        spectator.detectChanges();

        expect(panel()?.open()).toBe(true);
        expect(checkboxes().map(box => box.label())).toEqual(['Церковь', 'Общество']);
        expect(spectator.component.pending()).toBe(5);
    });

    it('keeps one section ticked: ticking another moves the tick', () => {
        render(5);
        spectator.component.togglePanel();

        spectator.component.onToggle(3, true);

        expect(spectator.component.pending()).toBe(3);
    });

    it('reports the section ticked on OK and closes', () => {
        render(5);
        spectator.component.togglePanel();
        spectator.component.onToggle(3, true);

        spectator.component.confirm();

        expect(picked).toEqual([3]);
        expect(spectator.component.isPanelOpen()).toBe(false);
    });

    it('reports nothing when the section stays as it was', () => {
        render(5);
        spectator.component.togglePanel();

        spectator.component.confirm();

        expect(picked).toEqual([]);
    });

    it('reports nothing when the tick is taken off', () => {
        render(5);
        spectator.component.togglePanel();
        spectator.component.onToggle(5, false);

        spectator.component.confirm();

        expect(picked).toEqual([]);
    });
});
