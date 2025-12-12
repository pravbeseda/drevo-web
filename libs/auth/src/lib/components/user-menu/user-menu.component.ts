import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { LoginModalComponent } from '../login-modal/login-modal.component';

@Component({
  selector: 'lib-user-menu',
  standalone: true,
  imports: [CommonModule, LoginModalComponent],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuComponent {
  readonly authService = inject(AuthService);
  private readonly elementRef = inject(ElementRef);

  readonly showLoginModal = signal(false);
  readonly showDropdown = signal(false);
  readonly isLoggingOut = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  openLoginModal(): void {
    this.showLoginModal.set(true);
  }

  closeLoginModal(): void {
    this.showLoginModal.set(false);
  }

  toggleDropdown(): void {
    this.showDropdown.update((v) => !v);
  }

  closeDropdown(): void {
    this.showDropdown.set(false);
  }

  async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    this.closeDropdown();
    await this.authService.logout();
    this.isLoggingOut.set(false);
  }
}
