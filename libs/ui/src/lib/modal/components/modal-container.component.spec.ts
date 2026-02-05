import { Component, Type, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { LoggerService } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { MODAL_DATA } from '../models/modal.tokens';
import { LazyComponentLoader, ModalData } from '../models/modal.types';
import { ModalContainerComponent } from './modal-container.component';

type TestData = { title: string };
type TestResult = string;
type TestContainerComponent = ModalContainerComponent<TestData, TestResult>;

@Component({
    standalone: true,
    template: '',
})
class TestModalComponent {
    readonly modalData = inject<ModalData<TestData, TestResult>>(MODAL_DATA);
}

describe('ModalContainerComponent', () => {
    let spectator: Spectator<TestContainerComponent>;
    let dialogRef: { close: jest.Mock };

    const createComponent = createComponentFactory<TestContainerComponent>({
        component: ModalContainerComponent as Type<TestContainerComponent>,
        providers: [mockLoggerProvider()],
    });

    const setup = (
        loader: LazyComponentLoader<TestModalComponent>,
        data?: TestData
    ) => {
        dialogRef = { close: jest.fn() };
        spectator = createComponent({
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        loader,
                        data: data ?? { title: 'Test modal' },
                    },
                },
            ],
        });
    };

    it('should show spinner while component is loading', async () => {
        let resolveLoader: (
            component: Type<TestModalComponent>
        ) => void = () => {};
        const loaderPromise = new Promise<Type<TestModalComponent>>(resolve => {
            resolveLoader = resolve;
        });
        const loader = jest.fn(() => loaderPromise);

        setup(loader);
        spectator.detectChanges();
        await spectator.fixture.whenStable();

        expect(loader).toHaveBeenCalledTimes(1);
        expect(spectator.query('.modal-loading')).toBeTruthy();
        expect(spectator.query('ui-spinner')).toBeTruthy();

        resolveLoader(TestModalComponent);
        await loaderPromise;
        spectator.detectChanges();
    });

    it('should load component and provide modal data', async () => {
        const loader = jest.fn(() => Promise.resolve(TestModalComponent));
        const data: TestData = { title: 'Details' };

        setup(loader, data);
        spectator.detectChanges();
        await spectator.fixture.whenStable();
        spectator.detectChanges();

        const modalDebug = spectator.fixture.debugElement.query(
            By.directive(TestModalComponent)
        );
        expect(modalDebug).toBeTruthy();

        const modalInstance =
            modalDebug.componentInstance as TestModalComponent;
        expect(modalInstance.modalData.data).toEqual(data);

        modalInstance.modalData.close('done');
        expect(dialogRef.close).toHaveBeenCalledWith('done');

        expect(spectator.query('.modal-loading')).toBeFalsy();
    });

    it('should log error and close dialog when loader rejects', async () => {
        const error = new Error('Load failed');
        const loader = jest.fn(() => Promise.reject(error));

        setup(loader);
        spectator.detectChanges();
        await spectator.fixture.whenStable();
        spectator.detectChanges();

        const loggerService = spectator.inject(
            LoggerService
        ) as unknown as MockLoggerService;
        expect(loggerService.mockLogger.error).toHaveBeenCalledWith(
            'Failed to load modal component:',
            error
        );
        expect(dialogRef.close).toHaveBeenCalled();
    });
});
