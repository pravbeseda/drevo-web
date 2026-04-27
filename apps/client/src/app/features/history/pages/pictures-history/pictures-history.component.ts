import { PicturePendingCardComponent } from '../../components/picture-pending-card/picture-pending-card.component';
import { PicturesHistoryService, trackByFn } from '../../services/pictures-history.service';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
    FormatTimePipe,
    SpinnerComponent,
    VirtualScrollerComponent,
    VirtualScrollerItemDirective,
} from '@drevo-web/ui';

@Component({
    selector: 'app-pictures-history',
    imports: [
        PicturePendingCardComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
        FormatTimePipe,
    ],
    templateUrl: './pictures-history.component.html',
    styleUrl: './pictures-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [PicturesHistoryService],
})
export class PicturesHistoryComponent implements OnInit {
    protected readonly service = inject(PicturesHistoryService);
    protected readonly trackByFn = trackByFn;
    private readonly router = inject(Router);

    ngOnInit(): void {
        this.service.init();
    }

    onPictureClick(pictureId: number): void {
        this.router.navigate(['/pictures', pictureId]);
    }
}
