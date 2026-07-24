import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductPlace, StoreHoursInfo, TodaySchedule } from '../../../models/product-place.interface';
import { Subject, takeUntil } from 'rxjs';
import { ProductPlaceService } from '../../core/api/product-place.service';

declare var ymaps: any;

@Component({
  selector: 'app-shop-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './shop-details.component.html',
  styleUrls: ['./shop-details.component.scss']
})
export class ShopDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  shop: any | null = null;
  similarShops: ProductPlace[] = [];
  activeTab: 'info' | 'map' | 'services' = 'info';
  loading = true;
  error: string | null = null;
  todaySchedule: any | null = null;
  storeHoursInfo: StoreHoursInfo[] = [];
  allShops: ProductPlace[] = [];

  private map: any = null;
  private placemark: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public productPlaceService: ProductPlaceService
  ) {}

  ngOnInit(): void {
    this.scrollToTopSmooth();
    this.loadAllShops();

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const shopId = params['id'];
        this.loadShop(shopId);
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.scrollToTopSmooth();
      if (this.activeTab === 'map' && this.shop) {
        this.initMap();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productPlaceService.clearSelectedStore();
    this.destroyMap();
  }

  private loadAllShops(): void {
    this.productPlaceService.productPlaces$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shops) => {
          this.allShops = shops || [];
        },
        error: (err) => {
          this.allShops = [];
        }
      });
  }

  private scrollToTopSmooth(): void {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } catch (error) {
      window.scrollTo(0, 0);
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

            if (this.allShops.length > 0) {
              this.loadSimilarShops(shop);
            } else {
              setTimeout(() => {
                if (this.allShops.length > 0) {
                  this.loadSimilarShops(shop);
                }
              }, 500);
            }

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
          this.error = 'Произошла ошибка при загрузке данных';
          this.loading = false;
        }
      });
  }

  loadSimilarShops(currentShop: ProductPlace): void {
    const city = currentShop.address?.city;
    if (!city) {
      this.similarShops = [];
      return;
    }

    const filteredShops = this.allShops.filter(shop => {
      if (!shop.address || !shop.address.city) return false;
      if (shop.id === currentShop.id) return false;
      return shop.address.city.trim().toLowerCase() === city.trim().toLowerCase();
    });

    this.similarShops = filteredShops.slice(0, 3);
  }

  setActiveTab(tab: 'info' | 'map' | 'services'): void {
    this.activeTab = tab;
    setTimeout(() => {
      this.scrollToTopSmooth();
      if (tab === 'map' && this.shop && !this.map) {
        setTimeout(() => this.initMap(), 100);
      }
    }, 10);
  }

  private initMap(): void {
    if (!this.shop?.address?.latitude || !this.shop?.address?.longitude) {
      return;
    }

    if (!this.mapContainer?.nativeElement) {
      return;
    }

    if (typeof ymaps === 'undefined') {
      return;
    }

    ymaps.ready(() => {
      const coords: [number, number] = [
        this.shop.address.latitude,
        this.shop.address.longitude
      ];

      this.map = new ymaps.Map(this.mapContainer.nativeElement, {
        center: coords,
        zoom: 16,
        controls: ['zoomControl', 'geolocationControl']
      });

      const balloonContent = `
        <div style="padding: 10px; min-width: 200px;">
          <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #111827;">
            ${this.shop.fullName || this.shop.shortName}
          </h3>
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
            <strong>Адрес:</strong> ${this.productPlaceService.getFullAddress(this.shop)}
          </p>
          ${this.shop.partner?.email ? `
            <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
              <strong>Телефон:</strong> ${this.formatPhone(this.shop.partner.email)}
            </p>
          ` : ''}
          <p style="margin: 0; font-size: 13px; color: ${this.isOpenNow() ? '#10b981' : '#ef4444'}; font-weight: 600;">
            ${this.isOpenNow() ? '● Открыто сейчас' : '● Закрыто'}
          </p>
        </div>
      `;

      this.placemark = new ymaps.Placemark(
        coords,
        {
          hintContent: this.shop.fullName || this.shop.shortName,
          balloonContent: balloonContent
        },
        {
          preset: 'islands#greenDotIconWithCaption',
          iconCaptionMaxWidth: '200'
        }
      );

      this.map.geoObjects.add(this.placemark);

      setTimeout(() => {
        this.placemark.balloon.open();
      }, 500);
    });
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.destroy();
      this.map = null;
      this.placemark = null;
    }
  }

  shareShop(): void {
    if (navigator.share && this.shop) {
      navigator.share({
        title: this.shop.fullName,
        text: `Посмотрите магазин ${this.shop.fullName} в ${this.shop.address?.city}`,
        url: window.location.href,
      }).catch();
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Ссылка скопирована в буфер обмена!');
      });
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
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
      }
      return phone;
    }
    return '';
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
}