import type { ModerationSheetData } from './moderation-sheet.component';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { ModerationResult } from '@drevo-web/shared';
import { ModalService } from '@drevo-web/ui/modal';
import { Observable } from 'rxjs';

/** Opens the moderation sheet near full screen; the sheet and its CodeMirror load only on the first open. */
export function openModerationSheet(
    modalService: ModalService,
    version: VersionForModeration,
): Observable<ModerationResult | undefined> {
    return modalService.open<ModerationSheetData, ModerationResult>(
        () => import('./moderation-sheet.component').then(m => m.ModerationSheetComponent),
        { data: { version }, width: '96vw', maxWidth: '96vw', height: '90vh' },
    );
}
