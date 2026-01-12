import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductPlace, StoreHoursInfo, TodaySchedule } from '../../../models/product-place.interface';
import { Subject, takeUntil, first } from 'rxjs';
import { ProductPlaceService } from '../../core/api/product-place.service';

@Component({
  selector: 'app-shop-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './shop-details.component.html',
  styleUrls: ['./shop-details.component.scss']
})
export class ShopDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  shop: any | null = null;
  similarShops: ProductPlace[] = [];
  activeTab: 'info' | 'map' | 'services' = 'info';
  selectedImageIndex: number = 0;
  loading = true;
  error: string | null = null;
  todaySchedule: any | null = null;
  storeHoursInfo: StoreHoursInfo[] = [];
  allShops: ProductPlace[] = [];

  private destroy$ = new Subject<void>();

  // Дополнительные изображения магазина (пока заглушки)
  shopImages: string[] = [
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public productPlaceService: ProductPlaceService
  ) { }

  ngOnInit(): void {
    // Плавная прокрутка в начало при инициализации
    this.scrollToTopSmooth();
    
    // Загружаем все магазины один раз
    this.loadAllShops();
    
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const shopId = params['id'];
        console.log('Loading shop with ID:', shopId);
        this.loadShop(shopId);
      });
  }

  ngAfterViewInit(): void {
    // Дополнительная проверка через небольшой таймаут
    setTimeout(() => {
      this.scrollToTopSmooth();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productPlaceService.clearSelectedStore();
  }

  /**
   * Загрузить все магазины
   */
  private loadAllShops(): void {
    this.productPlaceService.productPlaces$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shops) => {
          this.allShops = shops || [];
          console.log('All shops loaded:', this.allShops.length);
        },
        error: (err) => {
          console.error('Error loading all shops:', err);
          this.allShops = [];
        }
      });
  }

  /**
   * Плавная прокрутка к началу страницы
   */
  private scrollToTopSmooth(): void {
    try {
      // Вариант 1: Используем стандартный метод
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    } catch (error) {
      console.log('Smooth scroll not supported, using instant scroll');
      // Вариант 2: Запасной вариант для старых браузеров
      window.scrollTo(0, 0);
    }
  }

  /**
   * Прокрутка к определенному элементу
   */
  scrollToElement(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  loadShop(id: string): void {
    this.loading = true;
    this.error = null;

    this.productPlaceService.getProductPlaceById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shop) => {
          if (shop) {
            this.shop = shop;
            this.todaySchedule = this.productPlaceService.getTodaySchedule(shop);
            this.storeHoursInfo = this.productPlaceService.getStoreHoursInfo(shop);
            
            // Ждем пока загрузятся все магазины, затем ищем похожие
            if (this.allShops.length > 0) {
              this.loadSimilarShops(shop);
            } else {
              // Если магазины еще не загрузились, подождем немного
              setTimeout(() => {
                if (this.allShops.length > 0) {
                  this.loadSimilarShops(shop);
                }
              }, 500);
            }
            
            // После загрузки данных снова прокручиваем вверх
            setTimeout(() => {
              this.scrollToTopSmooth();
            }, 50);
          } else {
            this.error = 'Магазин не найден';
            this.router.navigate(['/shops']);
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading shop:', err);
          this.error = 'Произошла ошибка при загрузке данных';
          this.loading = false;
        }
      });
  }

  loadSimilarShops(currentShop: ProductPlace): void {
    const city = currentShop.address?.city;
    if (!city) {
      console.log('No city found for current shop');
      this.similarShops = [];
      return;
    }

    console.log('Loading similar shops for city:', city);
    console.log('Current shop city:', city);
    console.log('Total shops available:', this.allShops.length);
    
    if (this.allShops.length === 0) {
      console.log('No shops available');
      this.similarShops = [];
      return;
    }

    // Фильтруем магазины: только того же города, исключая текущий
    const filteredShops = this.allShops
      .filter(shop => {
        // Проверяем, что магазин имеет адрес
        if (!shop.address || !shop.address.city) {
          console.log(`Shop ${shop.id} has no address or city`);
          return false;
        }

        // Исключаем текущий магазин
        if (shop.id === currentShop.id) {
          console.log(`Skipping current shop: ${shop.id}`);
          return false;
        }

        // Проверяем совпадение города (точное совпадение)
        const isSameCity = shop.address.city.trim().toLowerCase() === city.trim().toLowerCase();
        
        if (isSameCity) {
          console.log(`✅ Found similar shop: ${shop.fullName} in ${shop.address.city}`);
        } else {
          console.log(`❌ Different city: ${shop.fullName} in ${shop.address.city} (looking for: ${city})`);
        }

        return isSameCity;
      });

    console.log('Filtered shops count:', filteredShops.length);
    
    // Берем максимум 3 похожих магазина
    this.similarShops = filteredShops.slice(0, 3);
    
    // Отладочная информация
    this.similarShops.forEach((shop, index) => {
      console.log(`Similar shop ${index + 1}: ${shop.fullName} in ${shop.address?.city}`);
    });

    if (this.similarShops.length === 0) {
      console.log(`No similar shops found in the same city (${city})`);
      console.log('Available cities:', [...new Set(this.allShops.map(s => s.address?.city).filter(c => c))]);
    }
  }

  setActiveTab(tab: 'info' | 'map' | 'services'): void {
    this.activeTab = tab;
    // Плавная прокрутка к началу таба при переключении
    setTimeout(() => {
      this.scrollToTopSmooth();
    }, 10);
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  shareShop(): void {
    if (navigator.share && this.shop) {
      navigator.share({
        title: this.shop.fullName,
        text: `Посмотрите магазин ${this.shop.fullName} в ${this.shop.address?.city}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Ссылка скопирована в буфер обмена!');
      });
    }
  }

  callPhone(): void {
    if (this.shop?.partner?.email) {
      window.location.href = `tel:${this.shop.partner.email}`;
    }
  }

  openEmail(): void {
    if (this.shop?.partner?.email) {
      window.location.href = `mailto:${this.shop.partner.email}`;
    }
  }

  openDirections(): void {
    if (this.shop?.address?.latitude && this.shop.address.longitude) {
      const { latitude, longitude } = this.shop.address;
      window.open(`https://yandex.ru/maps/?pt=${longitude},${latitude}&z=17&l=map`, '_blank');
    }
  }

  formatPhone(phone: any): string {
    if (phone) {
      // Простой форматтер телефона
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
      }
      return phone;
    } else {
      return '';
    }
  }

  getFullAddress(): string {
    return this.shop ? this.productPlaceService.getFullAddress(this.shop) : '';
  }

  isOpenNow(): boolean {
    return this.todaySchedule?.isOpen || false;
  }

  getOpeningHours(): string {
    if (this.todaySchedule?.openTime && this.todaySchedule?.closeTime) {
      return `${this.todaySchedule.openTime} - ${this.todaySchedule.closeTime}`;
    }
    return this.shop?.storeSchedule ? 'Выходной' : 'Информация отсутствует';
  }

  getManagerName(): string {
    return this.shop?.partner?.fullName || 'Информация отсутствует';
  }

  getManagerPhone(): string {
    return this.shop?.partner?.email || '';
  }

  getSocialMediaLinks() {
    // Если есть ссылки на соцсети в данных, вернуть их
    // Пока заглушка
    return {
      instagram: this.shop?.partner?.email ? '#' : undefined,
      vk: this.shop?.partner?.email ? '#' : undefined,
      telegram: this.shop?.partner?.email ? '#' : undefined
    };
  }

  getFeatures(): string[] {
    const features: string[] = [];

    if (this.shop?.partner) {
      features.push('Официальный партнер');
    }

    if (this.todaySchedule?.isOpen) {
      features.push('Открыто сейчас');
    }

    if (this.shop?.storeSchedule?.workingHours?.some((h: any) => h.dayOfWeek === 0 || h.dayOfWeek === 6)) {
      features.push('Работает в выходные');
    }

    return features.length > 0 ? features : ['Стандартный магазин'];
  }
}