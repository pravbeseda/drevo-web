import type { ModerationSheetData } from './moderation-sheet.component';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { ModerationResult, PageKind } from '@drevo-web/shared';
import { ModalService } from '@drevo-web/ui/modal';
import { Observable } from 'rxjs';

/**
 * Opens the moderation sheet near full screen; the sheet and its CodeMirror load only on the first open.
 * The page kind goes in the modal's data: a dialog's injector does not see the page route's providers.
 */
export function openModerationSheet(
    modalService: ModalService,
    version: VersionForModeration,
    kind: PageKind,
): Observable<ModerationResult | undefined> {
    return modalService.open<ModerationSheetData, ModerationResult>(
        () => import('./moderation-sheet.component').then(m => m.ModerationSheetComponent),
        { data: { version, kind }, width: '96vw', maxWidth: '96vw', height: '90vh' },
    );
}
