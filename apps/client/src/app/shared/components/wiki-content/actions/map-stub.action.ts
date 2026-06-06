import { WikiAction } from './wiki-action';
import { inject, Injectable } from '@angular/core';
import { NotificationService } from '@drevo-web/core';

@Injectable()
export class MapStubAction implements WikiAction {
    readonly name = 'MapStub';

    private readonly notification = inject(NotificationService);

    canExecute(actionName: string): boolean {
        return actionName === 'toggleYandexMap' || actionName === 'googleMap';
    }

    execute(): void {
        this.notification.info('Функция еще не реализована');
    }
}
