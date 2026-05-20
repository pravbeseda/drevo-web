import { AccountDropdownComponent } from './account-dropdown/account-dropdown.component';
import { FontScaleControlComponent } from './font-scale-control/font-scale-control.component';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';
import { ARTICLE_TITLE_MAX_LENGTH, ArticleService } from '../../services/articles';
import { AuthService } from '../../services/auth/auth.service';
import { PageTitleStrategy } from '../../services/page-title.strategy';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    computed,
    effect,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DrawerService, LoggerService, NotificationService, WINDOW } from '@drevo-web/core';
import { IconButtonComponent, LineClampComponent, ModalService } from '@drevo-web/ui';

@Component({
    selector: 'app-header',
    imports: [
        AccountDropdownComponent,
        FontScaleControlComponent,
        LineClampComponent,
        ReactiveFormsModule,
        ThemeToggleComponent,
        IconButtonComponent,
    ],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
    private readonly modalService = inject(ModalService);
    private readonly drawerService = inject(DrawerService);
    private readonly pageTitleStrategy = inject(PageTitleStrategy);
    private readonly destroyRef = inject(DestroyRef);
    private readonly window = inject(WINDOW);
    private readonly logger = inject(LoggerService).withContext('HeaderComponent');
    private readonly authService = inject(AuthService);
    private readonly articleService = inject(ArticleService);
    private readonly notificationService = inject(NotificationService);

    readonly pageTitle = this.pageTitleStrategy.pageTitle;

    private readonly _isEditingTitle = signal(false);
    private readonly _isSavingTitle = signal(false);
    readonly isEditingTitle = this._isEditingTitle.asReadonly();

    private readonly titleInputRef = viewChild<ElementRef<HTMLInputElement>>('titleInput');

    private readonly user = toSignal(this.authService.user$);
    readonly canRename = computed(() => {
        const ctx = this.pageTitleStrategy.titleContext();
        return !!ctx && (this.user()?.permissions.canModerate ?? false);
    });

    readonly titleControl = new FormControl('', { nonNullable: true });
    readonly titleMaxLength = ARTICLE_TITLE_MAX_LENGTH;

    constructor() {
        effect(() => {
            const el = this.titleInputRef()?.nativeElement;
            if (el) {
                el.focus();
                el.select();
            }
        });
    }

    toggleDrawer(): void {
        this.drawerService.toggle();
    }

    openSearch(): void {
        this.modalService.open(() => import('../../features/search/search.component').then(m => m.SearchComponent), {
            width: '600px',
        });
    }

    onTitleClick(): void {
        if (!this.canRename()) return;
        const selection = this.window?.getSelection();
        if (selection && !selection.isCollapsed) return;

        this.titleControl.setValue(this.pageTitle());
        this._isEditingTitle.set(true);
        this.logger.info('Title edit started', { articleId: this.pageTitleStrategy.titleContext()?.articleId });
    }

    cancelTitleEdit(): void {
        if (this._isSavingTitle()) return;
        this._isEditingTitle.set(false);
    }

    onTitleEnter(event: Event): void {
        event.preventDefault();
        this.saveTitleEdit();
    }

    onTitleBlur(): void {
        if (this._isSavingTitle()) return;
        this.saveTitleEdit();
    }

    saveTitleEdit(): void {
        if (!this._isEditingTitle()) return;
        const value = this.titleControl.value.trim();
        const ctx = this.pageTitleStrategy.titleContext();
        if (!ctx || !value || value === ctx.title.trim()) {
            this.cancelTitleEdit();
            return;
        }
        if (value.length > ARTICLE_TITLE_MAX_LENGTH) {
            this.notificationService.error(`Название не может быть длиннее ${ARTICLE_TITLE_MAX_LENGTH} символов`);
            return;
        }

        this._isSavingTitle.set(true);
        this.titleControl.disable();
        this.articleService
            .renameArticle(ctx.articleId, value)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: result => {
                    this._isSavingTitle.set(false);
                    this._isEditingTitle.set(false);
                    this.titleControl.enable();
                    this.pageTitleStrategy.updateArticleTitle(result.title);
                    this.notificationService.success('Статья переименована');
                },
                error: (err: unknown) => {
                    this._isSavingTitle.set(false);
                    this.titleControl.enable();
                    if (err instanceof HttpErrorResponse && err.error?.errorCode === 'TITLE_ALREADY_EXISTS') {
                        this.notificationService.error('Статья с таким названием уже существует');
                    } else if (err instanceof HttpErrorResponse && err.error?.errorCode === 'VALIDATION_ERROR') {
                        this.notificationService.error(err.error.error ?? 'Не удалось переименовать статью');
                    } else {
                        this.notificationService.error('Не удалось переименовать статью');
                    }
                    this.logger.error('Rename failed', err);
                },
            });
    }
}
