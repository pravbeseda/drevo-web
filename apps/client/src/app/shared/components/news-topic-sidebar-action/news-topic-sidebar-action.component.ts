import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NewsTopic, SidebarActionPriority } from '@drevo-web/shared';
import { ButtonComponent } from '@drevo-web/ui/button';
import { CheckboxComponent } from '@drevo-web/ui/checkbox';
import { SidePanelComponent } from '@drevo-web/ui/side-panel';

/**
 * Picks the section of a news item the way an article's dictionaries are
 * picked: a sidebar action naming it, a side panel listing every section.
 * A news item is in one section — the API takes one — so a tick moves rather
 * than adds. What a pick means is the owner's: the editor keeps it, the news
 * page saves it.
 */
@Component({
    selector: 'app-news-topic-sidebar-action',
    imports: [ButtonComponent, CheckboxComponent, FormsModule, SidebarActionComponent, SidePanelComponent],
    templateUrl: './news-topic-sidebar-action.component.html',
    styleUrl: './news-topic-sidebar-action.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsTopicSidebarActionComponent {
    readonly topics = input.required<readonly NewsTopic[]>();
    /** The section the news item is in; absent until one is picked. */
    readonly selected = input<number | undefined>(undefined);
    readonly busy = input(false);

    readonly picked = output<number>();

    readonly label = computed(
        () => this.topics().find(topic => topic.id === this.selected())?.title ?? 'Укажите раздел',
    );
    readonly priority = computed<SidebarActionPriority>(() =>
        this.selected() === undefined ? 'primary' : 'secondary',
    );

    private readonly _isPanelOpen = signal(false);
    private readonly _pending = signal<number | undefined>(undefined);
    readonly isPanelOpen = this._isPanelOpen.asReadonly();
    /** The section ticked in the open panel. */
    readonly pending = this._pending.asReadonly();

    togglePanel(): void {
        if (!this._isPanelOpen()) {
            this._pending.set(this.selected());
        }
        this._isPanelOpen.update(open => !open);
    }

    closePanel(): void {
        this._isPanelOpen.set(false);
    }

    onToggle(topicId: number, checked: boolean): void {
        this._pending.set(checked ? topicId : undefined);
    }

    confirm(): void {
        const pending = this._pending();
        this._isPanelOpen.set(false);
        if (pending !== undefined && pending !== this.selected()) {
            this.picked.emit(pending);
        }
    }
}
