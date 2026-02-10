import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './core/components/header/header.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { AuthComponent } from './modules/auth/auth.component';
import { LocationComponent } from './core/components/location/location.component';
import { MobileBottomNavComponent } from './core/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { CommonModule } from '@angular/common';
import { BasketsService } from './core/api/baskets.service';
import { StorageUtils } from '../utils/storage.utils';
import { memoryCacheEnvironment } from '../environment';
import { ScrollStateService } from './core/services/scroll-state.service';

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

  constructor(private basketsService: BasketsService, private scrollStateService: ScrollStateService) { }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    // Очищаем при закрытии вкладки
    this.scrollStateService.clearHomeState();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= 950; // Примерная граница для мобильных устройств
    console.log('isMobile', this.isMobile);
  }

  ngOnInit() {
    this.isMobile = window.innerWidth <= 950;
    this.loadBaskets();
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
