import { Component, HostListener, OnDestroy, OnInit, Inject, PLATFORM_ID, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription, take } from 'rxjs';
import { isPlatformBrowser, CommonModule } from '@angular/common';

import { HeaderComponent } from './core/components/header/header.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { AuthComponent } from './modules/auth/auth.component';
import { LocationComponent } from './core/components/location/location.component';
import { MobileBottomNavComponent } from './core/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { BasketsService } from './core/api/baskets.service';
import { BasketsStateService } from './core/services/baskets-state.service';
import { UserService } from './core/services/user.service';
import { LocationService } from './core/components/location/location.service';
import { StorageUtils } from '../utils/storage.utils';
import { localStorageEnvironment } from '../environment';
import { FloatingContactButtonsComponent } from './core/components/floating-contact-buttons/floating-contact-buttons.component';
import { UserApiService } from './core/api/user.service';
import { AuthService } from './core/services/auth.service';
import { CookieConsentComponent } from './core/components/cookie-consent/cookie-consent.component';
import { guestRegisterRequest } from './core/interfaces/auth.interface';
import { FingerprintService } from './core/services/fingerprint.service';

declare let ym: any;

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    MobileBottomNavComponent,
    FooterComponent,
    AuthComponent,
    LocationComponent,
    FloatingContactButtonsComponent,
    CookieConsentComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  isMobile = false;
  isBrowser: boolean;
  operativeInfo = computed(() => this.userService.operativeInfo());

  private routerSubscription?: Subscription;
  private imageObserver?: IntersectionObserver;
  private protectedImages = new Set<HTMLImageElement>();
  private previousUrl = '';
  private userService = inject(UserService);
  private isAuthInitialized = false;

  constructor(
    private basketsService: BasketsService,
    private router: Router,
    private basketsStateService: BasketsStateService,
    @Inject(PLATFORM_ID) platformId: Object,
    public locationService: LocationService,
    private userApiService: UserApiService,
    private authService: AuthService,
    private fingerprintService: FingerprintService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    if (!this.isBrowser) return;

    // Инициализация Yandex Metrika
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (typeof ym !== 'undefined') {
        ym(110808930, 'hit', event.urlAfterRedirects);
      }
    });

    // Проверка города
    const currentCity = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.currentCity.key
    );

    if (currentCity == null) {
      this.locationService.showCityModal$.next(true);
    }

    // Инициализация защитных механизмов
    this.initMobileDetection();
    this.initRouterEvents();
    this.initImageProtection();
    this.injectProtectionStyles();

    // Инициализация авторизации
    await this.initializeAuth();

    // Проверка активного восстановления пароля
    if (this.authService.hasActiveRestore()) {
      this.authService.changeVisible(true);
    }
  }

  /**
   * Основная логика инициализации авторизации
   * 1. Проверяем наличие токена
   * 2. Если токен есть - валидируем
   * 3. Если токен не валиден - пробуем обновить через refreshToken
   * 4. Если refreshToken не работает или нет токена - регистрируем гостя
   */
  private async initializeAuth(): Promise<void> {
    if (this.isAuthInitialized) return;
    this.isAuthInitialized = true;

    const token = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key) as string | null;
    const refreshToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.refreshToken.key) as string | null;

    // Если есть токен - проверяем его
    if (token) {
      try {
        const isValid = await this.validateTokenWithRefresh(token, refreshToken);
        if (isValid) {
          // Токен валиден, загружаем корзины
          this.loadBaskets();
          this.userService.updateIsAuthUser(true);
          return;
        }
      } catch (error) {
        console.error('Token validation error:', error);
      }
    }

    // Если нет токена или он невалидный - регистрируем гостя
    await this.registerGuestUser();
  }

  /**
   * Валидация токена с автоматическим обновлением при необходимости
   */
  private validateTokenWithRefresh(token: string, refreshToken: string | null): Promise<boolean> {
    return new Promise((resolve) => {
      this.userApiService.validateToken().subscribe({
        next: (isValid: boolean) => {
          if (isValid) {
            resolve(true);
          } else if (refreshToken) {
            // Токен не валиден, пробуем обновить
            this.userApiService.refreshToken().subscribe({
              next: (response: any) => {
                if (response?.token) {
                  // Обновление успешно, сохраняем новые токены
                  this.authService.handleLoginSuccess(response);
                  resolve(true);
                } else {
                  // Обновление не удалось
                  this.clearAuthData();
                  resolve(false);
                }
              },
              error: () => {
                this.clearAuthData();
                resolve(false);
              }
            });
          } else {
            // Нет refresh токена
            this.clearAuthData();
            resolve(false);
          }
        },
        error: () => {
          // Ошибка валидации, пробуем обновить если есть refreshToken
          if (refreshToken) {
            this.userApiService.refreshToken().subscribe({
              next: (response: any) => {
                if (response?.token) {
                  this.authService.handleLoginSuccess(response);
                  resolve(true);
                } else {
                  this.clearAuthData();
                  resolve(false);
                }
              },
              error: () => {
                this.clearAuthData();
                resolve(false);
              }
            });
          } else {
            this.clearAuthData();
            resolve(false);
          }
        }
      });
    });
  }

  /**
   * Регистрация гостевого пользователя
   */
  private async registerGuestUser(): Promise<void> {
    try {
      const visitorId = await this.fingerprintService.getVisitorId();

      // Проверяем, может уже есть гостевой токен
      const guestToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key) as string | null;

      const guestData: guestRegisterRequest = {
        fingerprint: visitorId,
        existingGuestToken: guestToken || ''
      };

      this.authService.guestRegister(guestData).subscribe({
        next: (response: any) => {
          if (response?.data?.token) {
            // Сохраняем гостевой токен
            StorageUtils.setLocalStorageCache(
              localStorageEnvironment.auth.key,
              response.data.token,
              localStorageEnvironment.auth.ttl
            );

            StorageUtils.setLocalStorageCache(
              localStorageEnvironment.isGuestToken.key,
              true,
              localStorageEnvironment.isGuestToken.ttl
            );

            if (response.data.refreshToken) {
              StorageUtils.setLocalStorageCache(
                localStorageEnvironment.refreshToken.key,
                response.data.refreshToken,
                localStorageEnvironment.refreshToken.ttl
              );
            }

            // Загружаем корзины если они есть
            this.loadBaskets();
            this.userService.updateIsAuthUser(false);
          }
        },
        error: (error) => {
          console.error('Guest registration failed:', error);
        }
      });
    } catch (error) {
      console.error('Fingerprint generation failed:', error);
    }
  }

  /**
   * Очистка данных авторизации
   */
  private clearAuthData(): void {
    StorageUtils.removeLocalStorageCache(localStorageEnvironment.auth.key);
    StorageUtils.removeLocalStorageCache(localStorageEnvironment.refreshToken.key);
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.imageObserver?.disconnect();
    this.protectedImages.clear();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.isBrowser) {
      this.isMobile = window.innerWidth <= 950;
    }
  }

  @HostListener('document:dragstart', ['$event'])
  onDragStart(event: DragEvent): boolean {
    if ((event.target as HTMLElement)?.tagName === 'IMG') {
      event.preventDefault();
      this.showToast('Перетаскивание изображений запрещено', 'warning');
      return false;
    }
    return true;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const blockedKeys: Record<string, () => void> = {
      'PrintScreen': () => this.showToast('Создание скриншотов запрещено', 'warning'),
      'F12': () => this.showToast('Инструменты разработчика временно ограничены', 'info')
    };

    if (blockedKeys[event.key]) {
      event.preventDefault();
      blockedKeys[event.key]();
    }

    if (event.ctrlKey || event.metaKey) {
      const combos: Record<string, () => void> = {
        's': () => this.showToast('Сохранение страницы запрещено', 'warning'),
        'p': () => this.showToast('Печать страницы запрещена', 'warning'),
        'c': () => {
          if ((event.target as HTMLElement)?.tagName === 'IMG') {
            this.showToast('Копирование изображений запрещено', 'warning');
          }
        },
        'u': () => this.showToast('Инструменты разработчика временно ограничены', 'info')
      };

      if (combos[event.key]) {
        if (event.key !== 'c' || (event.target as HTMLElement)?.tagName === 'IMG') {
          event.preventDefault();
          combos[event.key]();
        }
      }

      if (event.shiftKey && (event.key === 'I' || event.key === 'C')) {
        event.preventDefault();
        this.showToast('Инструменты разработчика временно ограничены', 'info');
      }
    }
  }

  private loadBaskets(): void {
    this.basketsService.filterBaskets({ filters: [], sorts: [], page: 0, pageSize: 10 })
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          if (res && res.data) {
            this.basketsStateService.updateBaskets(res.data);
          }
        },
        error: (err) => {
          console.error('Failed to load baskets:', err);
        }
      });
  }

  private initMobileDetection(): void {
    if (this.isBrowser) {
      this.isMobile = window.innerWidth <= 950;
    }
  }

  private initRouterEvents(): void {
    if (!this.isBrowser) return;

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (!this.isOnlyPageParamChanged(this.previousUrl, event.urlAfterRedirects)) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        this.previousUrl = event.urlAfterRedirects;
        setTimeout(() => this.protectNewImages(), 100);
      });
  }

  private isOnlyPageParamChanged(prev: string, curr: string): boolean {
    if (!prev) return false;

    const [prevPath, prevSearch] = prev.split('?');
    const [currPath, currSearch] = curr.split('?');
    if (prevPath !== currPath) return false;

    const prevParams = new URLSearchParams(prevSearch);
    const currParams = new URLSearchParams(currSearch);

    for (const [key, value] of prevParams) {
      if (key === 'page') {
        if (currParams.get(key) !== value) continue;
      } else if (currParams.get(key) !== value) return false;
    }

    return true;
  }

  private initImageProtection(): void {
    if (!this.isBrowser) return;

    this.imageObserver = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && this.protectImage(e.target as HTMLImageElement)),
      { threshold: 0.1 }
    );

    document.querySelectorAll('img').forEach(img => this.protectImage(img));
  }

  private protectNewImages(): void {
    if (!this.isBrowser) return;

    document.querySelectorAll('img').forEach(img => {
      if (!this.protectedImages.has(img)) this.protectImage(img);
    });
  }

  private protectImage(img: HTMLImageElement): void {
    if (this.protectedImages.has(img) || !this.isBrowser) return;

    img.classList.add('protected-image');
    img.setAttribute('draggable', 'false');
    img.setAttribute('crossorigin', 'anonymous');

    if (!img.parentElement?.classList.contains('image-protector')) {
      const protector = document.createElement('div');
      protector.className = 'image-protector';
      Object.assign(protector.style, {
        position: 'relative',
        display: 'inline-block'
      });

      img.parentNode?.insertBefore(protector, img);
      protector.appendChild(img);
    }

    this.protectedImages.add(img);
    this.imageObserver?.observe(img);
  }

  private injectProtectionStyles(): void {
    if (!this.isBrowser) return;

    const style = document.createElement('style');
    style.textContent = `
      .protected-image{pointer-events:auto;user-select:none;-webkit-user-select:none}
      .protected-image:active{pointer-events:none}
      .image-protector{position:relative;display:inline-block;overflow:hidden}
      .image-protector::before{content:'';position:absolute;inset:0;z-index:1}
      img{-webkit-user-drag:none;user-drag:none}
    `;
    document.head.appendChild(style);
  }

  private showToast(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.isBrowser) return;

    const existing = document.querySelector('.toast-message');
    existing?.remove();

    const toast = document.createElement('div');
    const colors = { info: '#2196f3', warning: '#ff9800', error: '#f44336' };

    toast.className = 'toast-message';
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: colors[type],
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      zIndex: '9999',
      fontSize: '14px',
      fontFamily: 'sans-serif',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      animation: 'fadeInOut 2s ease-in-out'
    });

    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
}