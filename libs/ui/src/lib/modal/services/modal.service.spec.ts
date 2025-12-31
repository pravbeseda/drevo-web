import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { Subject } from 'rxjs';

import { ModalContainerComponent } from '../components/modal-container.component';
import { ModalConfig } from '../models/modal.types';
import { ModalService } from './modal.service';

@Component({ selector: 'test-modal', template: '', standalone: true })
class TestModalComponent {}

describe('ModalService', () => {
    let spectator: SpectatorService<ModalService>;
    let dialogMock: jest.Mocked<MatDialog>;
    let dialogRefMock: jest.Mocked<MatDialogRef<ModalContainerComponent>>;
    let afterClosedSubject: Subject<unknown>;

    const createService = createServiceFactory({
        service: ModalService,
        mocks: [MatDialog],
    });

    beforeEach(() => {
        afterClosedSubject = new Subject();
        dialogRefMock = {
            afterClosed: jest.fn().mockReturnValue(afterClosedSubject.asObservable()),
            close: jest.fn(),
        } as unknown as jest.Mocked<MatDialogRef<ModalContainerComponent>>;

        spectator = createService();
        dialogMock = spectator.inject(MatDialog) as jest.Mocked<MatDialog>;
        dialogMock.open.mockReturnValue(dialogRefMock);
    });

    afterEach(() => {
        afterClosedSubject.complete();
    });

    const mockLoader = () => Promise.resolve(TestModalComponent);

    describe('open', () => {
        it('should open dialog with default configuration', () => {
            spectator.service.open(mockLoader);

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    data: {
                        loader: mockLoader,
                        data: undefined,
                    },
                    width: '500px',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    disableClose: false,
                    autoFocus: 'first-tabbable',
                    restoreFocus: true,
                })
            );
        });

        it('should open dialog with custom data', () => {
            const customData = { userId: 123, name: 'Test' };

            spectator.service.open(mockLoader, { data: customData });

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    data: {
                        loader: mockLoader,
                        data: customData,
                    },
                })
            );
        });

        it('should apply custom width configuration', () => {
            const config: ModalConfig = {
                width: '800px',
                minWidth: '400px',
                maxWidth: '1200px',
            };

            spectator.service.open(mockLoader, config);

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    width: '800px',
                    minWidth: '400px',
                    maxWidth: '1200px',
                })
            );
        });

        it('should apply disableClose option', () => {
            spectator.service.open(mockLoader, { disableClose: true });

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    disableClose: true,
                })
            );
        });

        it('should add single custom panel class', () => {
            spectator.service.open(mockLoader, { panelClass: 'custom-class' });

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    panelClass: ['ui-modal-panel', 'custom-class'],
                })
            );
        });

        it('should add multiple custom panel classes', () => {
            spectator.service.open(mockLoader, {
                panelClass: ['class-one', 'class-two'],
            });

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    panelClass: ['ui-modal-panel', 'class-one', 'class-two'],
                })
            );
        });

        it('should return observable that emits on dialog close', () => {
            const result$ = spectator.service.open<void, string>(mockLoader);
            const results: (string | undefined)[] = [];

            result$.subscribe((value) => results.push(value));

            afterClosedSubject.next('result-value');
            afterClosedSubject.complete();

            expect(results).toEqual(['result-value']);
        });

        it('should return observable that emits undefined when closed without result', () => {
            const result$ = spectator.service.open(mockLoader);
            const results: unknown[] = [];

            result$.subscribe((value) => results.push(value));

            afterClosedSubject.next(undefined);
            afterClosedSubject.complete();

            expect(results).toEqual([undefined]);
        });
    });

    describe('openWithRef', () => {
        it('should open dialog and return closed observable and ref', () => {
            const { closed, ref } = spectator.service.openWithRef(mockLoader);

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    data: {
                        loader: mockLoader,
                        data: undefined,
                    },
                })
            );
            expect(closed).toBeDefined();
            expect(ref).toBeDefined();
            expect(ref.close).toBeDefined();
        });

        it('should open dialog with custom configuration', () => {
            const customData = { id: 1 };
            const config: ModalConfig<typeof customData> = {
                data: customData,
                width: '600px',
                disableClose: true,
            };

            spectator.service.openWithRef(mockLoader, config);

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    data: {
                        loader: mockLoader,
                        data: customData,
                    },
                    width: '600px',
                    disableClose: true,
                })
            );
        });

        it('should allow closing dialog via ref without result', () => {
            const { ref } = spectator.service.openWithRef(mockLoader);

            ref.close();

            expect(dialogRefMock.close).toHaveBeenCalledWith(undefined);
        });

        it('should allow closing dialog via ref with result', () => {
            const { ref } = spectator.service.openWithRef<void, string>(mockLoader);

            ref.close('success');

            expect(dialogRefMock.close).toHaveBeenCalledWith('success');
        });

        it('should emit result through closed observable', () => {
            const { closed } = spectator.service.openWithRef<void, number>(mockLoader);
            const results: (number | undefined)[] = [];

            closed.subscribe((value) => results.push(value));

            afterClosedSubject.next(42);
            afterClosedSubject.complete();

            expect(results).toEqual([42]);
        });
    });

    describe('buildPanelClasses (private method via public API)', () => {
        it('should always include base panel class', () => {
            spectator.service.open(mockLoader);

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    panelClass: ['ui-modal-panel'],
                })
            );
        });

        it('should handle undefined panelClass', () => {
            spectator.service.open(mockLoader, { panelClass: undefined });

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    panelClass: ['ui-modal-panel'],
                })
            );
        });

        it('should handle empty string panelClass', () => {
            spectator.service.open(mockLoader, { panelClass: '' });

            // Empty string is falsy, so it won't be added
            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    panelClass: ['ui-modal-panel'],
                })
            );
        });

        it('should handle empty array panelClass', () => {
            spectator.service.open(mockLoader, { panelClass: [] });

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    panelClass: ['ui-modal-panel'],
                })
            );
        });
    });

    describe('type safety', () => {
        it('should preserve data type through configuration', () => {
            interface CustomData {
                userId: number;
                permissions: string[];
            }

            const data: CustomData = {
                userId: 123,
                permissions: ['read', 'write'],
            };

            spectator.service.open<CustomData>(mockLoader, { data });

            expect(dialogMock.open).toHaveBeenCalledWith(
                ModalContainerComponent,
                expect.objectContaining({
                    data: expect.objectContaining({
                        data,
                    }),
                })
            );
        });
    });
});
