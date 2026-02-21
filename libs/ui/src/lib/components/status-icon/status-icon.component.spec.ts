import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ApprovalStatus } from '@drevo-web/shared';

import { StatusIconComponent } from './status-icon.component';

describe('StatusIconComponent', () => {
    let spectator: Spectator<StatusIconComponent>;
    const createComponent = createComponentFactory({
        component: StatusIconComponent,
        imports: [NoopAnimationsModule],
    });

    it('should create', () => {
        spectator = createComponent({ props: { status: ApprovalStatus.Approved } });
        expect(spectator.component).toBeTruthy();
    });

    it('should display check_circle icon for approved status', () => {
        spectator = createComponent({ props: { status: ApprovalStatus.Approved } });
        expect(spectator.query('ui-icon')).toBeTruthy();
        expect(spectator.query('mat-icon')).toHaveText('check_circle');
    });

    it('should display schedule icon for pending status', () => {
        spectator = createComponent({ props: { status: ApprovalStatus.Pending } });
        expect(spectator.query('mat-icon')).toHaveText('schedule');
    });

    it('should display cancel icon for rejected status', () => {
        spectator = createComponent({ props: { status: ApprovalStatus.Rejected } });
        expect(spectator.query('mat-icon')).toHaveText('cancel');
    });

    it('should apply approval class to host element', () => {
        spectator = createComponent({ props: { status: ApprovalStatus.Approved } });
        expect(spectator.element).toHaveClass('approved');
    });

    it('should update class when status changes', () => {
        spectator = createComponent({ props: { status: ApprovalStatus.Approved } });
        expect(spectator.element).toHaveClass('approved');

        spectator.setInput('status', ApprovalStatus.Rejected);
        expect(spectator.element).toHaveClass('rejected');
        expect(spectator.element).not.toHaveClass('approved');
    });
});
