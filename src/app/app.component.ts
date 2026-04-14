import { Component, HostListener, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './core/components/header/header.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { AuthComponent } from './modules/auth/auth.component';
import { LocationComponent } from './core/components/location/location.component';
import { MobileBottomNavComponent } from './core/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { CommonModule } from '@angular/common';
import { BasketsService } from './core/api/baskets.service';
import { StorageUtils } from '../utils/storage.utils';
import { memoryCacheEnvironment } from '../environment';
import { filter, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

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
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'PaketonShop';
  isMobile: boolean = false;

  private previousUrl: string = '';
  private isFlipbookPageChange: boolean = false;
  private routerSubscription: Subscription | null = null;

  constructor(
    private basketsService: BasketsService,
    private router: Router,
    private renderer: Renderer2
  ) { }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.isMobile = window.innerWidth <= 950;
  }

  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): boolean {
    const target = event.target as HTMLElement;

    if (target?.tagName === 'IMG') {
      event.preventDefault();
      return false;
    }
    return true;
  }

  @HostListener('document:dragstart', ['$event'])
  onDragStart(event: DragEvent): boolean {
    const target = event.target as HTMLElement;

    if (target?.tagName === 'IMG') {
      event.preventDefault();
      return false;
    }
    return true;
  }

  ngOnInit(): void {
    this.initMobileDetection();
    this.loadBaskets();
    this.initRouterEvents();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  /**
   * Инициализация определения мобильного устройства
   */
  private initMobileDetection(): void {
    this.isMobile = window.innerWidth <= 950;
  }

  /**
   * Инициализация обработки событий роутера
   */
  private initRouterEvents(): void {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.handleNavigationEnd(event);
      });
  }

  /**
   * Обработка завершения навигации
   */
  private handleNavigationEnd(event: NavigationEnd): void {
    const currentUrl = event.urlAfterRedirects;
    const isFlipbookWithPage = this.isFlipbookUrlWithPage(currentUrl);
    const isOnlyPageParamChanged = this.isOnlyPageParamChanged(this.previousUrl, currentUrl);

    if (isFlipbookWithPage && isOnlyPageParamChanged) {
      this.isFlipbookPageChange = true;
    } else {
      this.isFlipbookPageChange = false;
      this.scrollToTop();
    }

    this.previousUrl = currentUrl;
  }

  /**
   * Плавная прокрутка наверх
   */
  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Проверяет, является ли URL страницей флипбука с параметром page
   */
  private isFlipbookUrlWithPage(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.searchParams.get('viewMode') === 'flipbook' &&
        urlObj.searchParams.has('page');
    } catch {
      return url.includes('viewMode=flipbook') && url.includes('page=');
    }
  }

  /**
   * Проверяет, изменился ли только параметр page при одинаковом пути
   */
  private isOnlyPageParamChanged(previousUrl: string, currentUrl: string): boolean {
    if (!previousUrl) return false;

    try {
      const prevUrlObj = new URL(previousUrl, window.location.origin);
      const currUrlObj = new URL(currentUrl, window.location.origin);

      if (prevUrlObj.pathname !== currUrlObj.pathname) {
        return false;
      }

      const prevParams = new URLSearchParams(prevUrlObj.search);
      const currParams = new URLSearchParams(currUrlObj.search);

      return this.compareParamsWithPageOnly(prevParams, currParams);
    } catch {
      return this.compareParamsFallback(previousUrl, currentUrl);
    }
  }

  /**
   * Сравнение параметров URL с учетом только page
   */
  private compareParamsWithPageOnly(prevParams: URLSearchParams, currParams: URLSearchParams): boolean {
    let pageChanged = false;
    let otherParamsMatch = true;

    // Проверяем все параметры из предыдущего URL
    for (const [key, value] of prevParams.entries()) {
      if (key === 'page') {
        if (currParams.get(key) !== value) {
          pageChanged = true;
        }
      } else {
        if (currParams.get(key) !== value) {
          otherParamsMatch = false;
          break;
        }
      }
    }

    // Проверяем, нет ли новых параметров (кроме page)
    if (otherParamsMatch) {
      for (const [key] of currParams.entries()) {
        if (key !== 'page' && !prevParams.has(key)) {
          otherParamsMatch = false;
          break;
        }
      }
    }

    return otherParamsMatch && pageChanged;
  }

  /**
   * Fallback метод для сравнения параметров при ошибках
   */
  private compareParamsFallback(previousUrl: string, currentUrl: string): boolean {
    if (!previousUrl || !currentUrl) return false;

    const prevParts = previousUrl.split('?');
    const currParts = currentUrl.split('?');

    if (prevParts[0] !== currParts[0]) return false;

    // Если нет параметров в одном из URL
    if (prevParts.length === 1 || currParts.length === 1) return false;

    const prevParams = new URLSearchParams(prevParts[1] || '');
    const currParams = new URLSearchParams(currParts[1] || '');

    return this.compareParamsWithPageOnly(prevParams, currParams);
  }

  /**
   * Загрузить корзины пользователя
   */
  loadBaskets(): void {
    this.basketsService
      .filterBaskets({
        filters: [],
        sorts: [],
        page: 0,
        pageSize: 10,
      })
      .pipe(take(1)) // Автоматически завершаем подписку
      .subscribe({
        next: (res) => {
          StorageUtils.setMemoryCache(
            memoryCacheEnvironment.baskets.key,
            res.data,
            memoryCacheEnvironment.baskets.ttl,
          );
        },
        error: (err) => console.error('Ошибка загрузки корзин', err),
      });
  }
}