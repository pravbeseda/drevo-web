import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-yii-iframe',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './yii-iframe.component.html',
  styleUrls: ['./yii-iframe.component.scss']
})
export class YiiIframeComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy$ = new Subject<void>();
  private readonly isBrowser: boolean;
  private currentIframePath = '/';
  private pendingIframeNavigationPath: string | null = null;
  
  iframeSrc: SafeResourceUrl | null = null;
  isLoading = true;
  hasError = false;
  errorMessage = '';

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.updateIframeSrc();
    this.setupMessageListener();
    this.setupRouterListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.isBrowser) {
      window.removeEventListener('message', this.handleMessage);
    }
  }

  private updateIframeSrc(): void {
    const normalizedPath = this.normalizePath(this.router.url);

    if (this.pendingIframeNavigationPath && normalizedPath === this.pendingIframeNavigationPath) {
      console.log('[YiiIframe] Iframe already handled navigation, skipping src update');
      this.currentIframePath = normalizedPath;
      this.pendingIframeNavigationPath = null;
      return;
    }

    this.pendingIframeNavigationPath = null;
    this.currentIframePath = normalizedPath;

    const yiiUrl =
      normalizedPath === '/'
        ? '/legacy/'
        : `/legacy${normalizedPath}`;

    console.log('[YiiIframe] Updating iframe src:', yiiUrl);
    this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(yiiUrl);
    this.isLoading = true;
    this.hasError = false;
  }

  /**
   * Настройка слушателя сообщений от iframe
   */
  private setupMessageListener(): void {
    if (!this.isBrowser) {
      return;
    }

    window.addEventListener('message', this.handleMessage);
  }

  /**
   * Обработчик сообщений от iframe (должен быть стрелочной функцией для корректного this)
   */
  private handleMessage = (event: MessageEvent): void => {
    // Проверяем origin (в production используйте конкретный origin)
    const allowedOrigins = [
      'http://localhost:4200',
      'http://drevo-local.ru',
      'https://drevo-info.ru',
      'https://staging.drevo-info.ru',
      'https://new.drevo-info.ru',
    ];

    if (!allowedOrigins.includes(event.origin)) {
      return;
    }

    // Проверяем тип сообщения
    if (event.data?.type !== 'yii-navigation') {
      return;
    }

    const path = event.data.path;
    const normalizedPath = this.normalizePath(path);
    console.log('[YiiIframe] Navigation event from iframe:', path);

    // Проверяем, не совпадает ли путь с текущим URL
    if (this.router.url === path) {
      console.log('[YiiIframe] Path already matches current URL, skipping navigation');
      return;
    }

    this.pendingIframeNavigationPath = normalizedPath;
    this.currentIframePath = normalizedPath;
    this.isLoading = true;
    this.hasError = false;

    // Обновляем URL браузера без перезагрузки страницы
    void this.router.navigateByUrl(path, {
      replaceUrl: false,
      skipLocationChange: false
    });
  };

  /**
   * Настройка слушателя изменений роутера
   * Синхронизирует iframe после каждого NavigationEnd
   */
  private setupRouterListener(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log('[YiiIframe] Router navigation detected, updating iframe');
        this.updateIframeSrc();
      });
  }

  onIframeLoad(): void {
    this.isLoading = false;
    this.hasError = false;
  }

  onIframeError(): void {
    this.isLoading = false;
    this.hasError = true;
    this.errorMessage = 'Failed to load Yii page. Please try again.';
  }

  reload(): void {
    this.updateIframeSrc();
  }

  private normalizePath(path: string): string {
    if (!path || path === '/') {
      return '/';
    }

    return path.startsWith('/') ? path : `/${path}`;
  }
}
