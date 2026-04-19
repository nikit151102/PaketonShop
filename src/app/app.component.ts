import { Component, HostListener, OnDestroy, OnInit, Inject, PLATFORM_ID, computed } from '@angular/core';
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

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    MobileBottomNavComponent,
    FooterComponent,
    AuthComponent,
    LocationComponent
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

  constructor(
    private basketsService: BasketsService,
    private router: Router,
    private basketsStateService: BasketsStateService,
    private userService: UserService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    
    this.initMobileDetection();
    this.initRouterEvents();
    this.initImageProtection();
    this.injectProtectionStyles();
    this.loadBaskets();
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.imageObserver?.disconnect();
    this.protectedImages.clear();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.isBrowser) this.isMobile = window.innerWidth <= 950;
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
        'c': () => (event.target as HTMLElement)?.tagName === 'IMG' && this.showToast('Копирование изображений запрещено', 'warning'),
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
          this.basketsStateService.updateBaskets(res.data);
          this.userService.updateIsAuthUser(true);
        },
        error: (err) => console.error('Ошибка загрузки корзин', err)
      });
  }

  private initMobileDetection(): void {
    this.isMobile = window.innerWidth <= 950;
  }

  private initRouterEvents(): void {
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
    this.imageObserver = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && this.protectImage(e.target as HTMLImageElement)),
      { threshold: 0.1 }
    );
    
    document.querySelectorAll('img').forEach(img => this.protectImage(img));
  }

  private protectNewImages(): void {
    document.querySelectorAll('img').forEach(img => {
      if (!this.protectedImages.has(img)) this.protectImage(img);
    });
  }

  private protectImage(img: HTMLImageElement): void {
    if (this.protectedImages.has(img)) return;
    
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