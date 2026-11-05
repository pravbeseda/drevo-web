import { NewsMetaDialogComponent, NewsMetaDialogData } from './news-meta-dialog.component';
import { NewsService } from '../../../../services/news/news.service';
import { NewsFieldsComponent } from '../../../../shared/components/news-fields/news-fields.component';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NewsMeta } from '@drevo-web/shared';
import { MODAL_DATA } from '@drevo-web/ui/modal';
import { Spectator, SpyObject, createComponentFactory, mockProvider } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';

describe('NewsMetaDialogComponent', () => {
    let spectator: Spectator<NewsMetaDialogComponent>;
    let newsService: SpyObject<NewsService>;
    let notification: SpyObject<NotificationService>;
    const close = jest.fn();

    const data: NewsMetaDialogData = {
        newsId: 7,
        fields: { title: 'Новость', newsDate: '2026-11-05', topic: 3 },
        rank: 4,
    };
    const saved: NewsMeta = {
        articleId: 7,
        title: 'Новость',
        newsDate: new Date(2026, 10, 5),
        topics: [5],
        rank: 6,
        numlist: 1,
    };

    const createComponent = createComponentFactory({
        component: NewsMetaDialogComponent,
        providers: [
            mockLoggerProvider(),
            mockProvider(NewsService),
            mockProvider(NotificationService),
            { provide: MODAL_DATA, useValue: { data, close } },
        ],
    });

    beforeEach(() => {
        close.mockReset();
        spectator = createComponent();
        newsService = spectator.inject(NewsService);
        notification = spectator.inject(NotificationService);
        newsService.updateMeta.mockReturnValue(of(saved));
    });

    it('shows the title and the day the news item has', () => {
        expect(spectator.query(NewsFieldsComponent)?.value()).toEqual(data.fields);
        expect(spectator.component.rank()).toBe(4);
    });

    it('sends only what was changed, then closes with what the news item now holds', () => {
        spectator.component.onRank(6);
        spectator.component.onMailing(1);

        spectator.component.save();

        expect(newsService.updateMeta).toHaveBeenCalledWith(7, { rank: 6, numlist: 1 });
        expect(close).toHaveBeenCalledWith(saved);
    });

    it('sends a trimmed title and a new day', () => {
        spectator.component.onFields({ ...data.fields, title: '  Другая  ', newsDate: '2026-11-06' });

        spectator.component.save();

        expect(newsService.updateMeta).toHaveBeenCalledWith(7, { title: 'Другая', newsDate: '2026-11-06' });
    });

    it('closes without a request when nothing was changed', () => {
        spectator.component.save();

        expect(newsService.updateMeta).not.toHaveBeenCalled();
        expect(close).toHaveBeenCalledWith(undefined);
    });

    it.each([
        ['a title', { title: ' ' }, 'Введите заголовок новости'],
        ['a day', { newsDate: '' }, 'Укажите дату новости'],
    ])('asks for %s before sending', (_case, change, message) => {
        spectator.component.onFields({ ...data.fields, ...change });

        spectator.component.save();

        expect(notification.info).toHaveBeenCalledWith(message);
        expect(newsService.updateMeta).not.toHaveBeenCalled();
    });

    it('stays open and says why when the backend refuses', () => {
        newsService.updateMeta.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 400, error: { error: 'Неизвестный раздел' } })),
        );
        spectator.component.onRank(6);

        spectator.component.save();

        expect(notification.error).toHaveBeenCalledWith('Неизвестный раздел');
        expect(close).not.toHaveBeenCalled();
        expect(spectator.component.isSaving()).toBe(false);
    });

    it('closes without a result on cancel', () => {
        spectator.component.cancel();

        expect(close).toHaveBeenCalledWith();
    });
});
