import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ComponentRef,
    Injector,
    ViewContainerRef,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { MODAL_DATA } from '../models/modal.tokens';
import { LazyComponentLoader, ModalData } from '../models/modal.types';
import { LoggerService } from '@drevo-web/core';

interface LazyModalData<TData = unknown> {
    loader: LazyComponentLoader<unknown>;
    data: TData;
}

@Component({
    selector: 'ui-modal-container',
    imports: [SpinnerComponent],
    templateUrl: 'modal-container.component.html',
    styleUrl: './modal-container.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalContainerComponent<TData = unknown, TResult = unknown>
    implements AfterViewInit
{
    private readonly dialogRef =
        inject<MatDialogRef<ModalContainerComponent<TData, TResult>, TResult>>(
            MatDialogRef
        );
    private readonly dialogData = inject<LazyModalData<TData>>(MAT_DIALOG_DATA);
    private readonly injector = inject(Injector);
    private readonly logger = inject(LoggerService).withContext(
        'ModalContainerComponent'
    );

    private readonly outlet = viewChild.required('outlet', {
        read: ViewContainerRef,
    });

    protected readonly isLoading = signal(true);

    private componentRef: ComponentRef<unknown> | undefined = undefined;

    ngAfterViewInit(): void {
        this.loadComponent();
    }

    private async loadComponent(): Promise<void> {
        try {
            const componentType = await this.dialogData.loader();

            const modalData: ModalData<TData, TResult> = {
                data: this.dialogData.data,
                close: (result?: TResult) => this.dialogRef.close(result),
            };

            const injector = Injector.create({
                providers: [{ provide: MODAL_DATA, useValue: modalData }],
                parent: this.injector,
            });

            this.componentRef = this.outlet().createComponent(componentType, {
                injector,
            });
            this.isLoading.set(false);
        } catch (error) {
            this.logger.error('Failed to load modal component:', error);
            this.dialogRef.close();
        }
    }
}
