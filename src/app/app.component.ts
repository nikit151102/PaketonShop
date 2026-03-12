import { Component, HostListener } from '@angular/core';
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
import { filter } from 'rxjs';

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
export class AppComponent {
  title = 'PaketonShop';
  isMobile: boolean = false;
  
  private previousUrl: string = '';
  private isFlipbookPageChange: boolean = false;

  constructor(private basketsService: BasketsService, private router: Router) { }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= 950;
  }

  ngOnInit() {
    this.isMobile = window.innerWidth <= 950;
    this.loadBaskets();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const currentUrl = event.urlAfterRedirects;
      const isFlipbookWithPage = this.isFlipbookUrlWithPage(currentUrl);
      const isOnlyPageParamChanged = this.isOnlyPageParamChanged(this.previousUrl, currentUrl);
      if (isFlipbookWithPage && isOnlyPageParamChanged) {
        this.isFlipbookPageChange = true;
      } else {
        this.isFlipbookPageChange = false;
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      }
      this.previousUrl = currentUrl;
    });
  }

  /**
   * Проверяет, является ли URL страницей флипбука с параметром page
   */
  private isFlipbookUrlWithPage(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.origin);
      const hasViewModeFlipbook = urlObj.searchParams.get('viewMode') === 'flipbook';
      const hasPageParam = urlObj.searchParams.has('page');

      return hasViewModeFlipbook && hasPageParam;
    } catch (e) {
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

      const prevParams = new Map<string, string>();
      const currParams = new Map<string, string>();

      prevUrlObj.searchParams.forEach((value, key) => {
        prevParams.set(key, value);
      });

      currUrlObj.searchParams.forEach((value, key) => {
        currParams.set(key, value);
      });

      let diffCount = 0;
      let onlyPageDiff = true;

      for (const [key, value] of prevParams) {
        if (key === 'page') {
          if (currParams.get(key) !== value) {
            diffCount++;
          }
        } else {
          if (currParams.get(key) !== value) {
            onlyPageDiff = false;
            break;
          }
        }
      }

      for (const [key] of currParams) {
        if (!prevParams.has(key) && key !== 'page') {
          onlyPageDiff = false;
          break;
        }
      }

      return onlyPageDiff && diffCount === 1;

    } catch (e) {
      if (!previousUrl || !currentUrl) return false;

      const prevParts = previousUrl.split('?');
      const currParts = currentUrl.split('?');

      if (prevParts[0] !== currParts[0]) return false;

      if (prevParts.length === 1 && currParts.length === 1) return false;
      if (prevParts.length === 1 && currParts.length > 1) return false;
      if (prevParts.length > 1 && currParts.length === 1) return false;

      const prevParams = new URLSearchParams(prevParts[1] || '');
      const currParams = new URLSearchParams(currParts[1] || '');

      let allMatch = true;
      let pageChanged = false;

      prevParams.forEach((value, key) => {
        if (key === 'page') {
          if (currParams.get(key) !== value) pageChanged = true;
        } else {
          if (currParams.get(key) !== value) allMatch = false;
        }
      });

      currParams.forEach((value, key) => {
        if (key !== 'page' && !prevParams.has(key)) {
          allMatch = false;
        }
      });

      return allMatch && pageChanged;
    }
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
      .subscribe({
        next: (res) => {
          // this.baskets = res.data;
          StorageUtils.setMemoryCache(
            memoryCacheEnvironment.baskets.key,
            res.data,
            memoryCacheEnvironment.baskets.ttl,
          );
          // this.activeBasket = this.baskets[0] || undefined;
        },
        error: (err) => console.error('Ошибка загрузки корзин', err),
      });
  }
}
