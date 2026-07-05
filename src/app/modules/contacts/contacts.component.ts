import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { StoreService, Store, StoreCategory } from './store.service';
import { PhoneLinkPipe } from './phone-link.pipe';
import { WhatsappLinkPipe } from './whatsapp-link.pipe';

declare var ymaps: any;

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, PhoneLinkPipe, WhatsappLinkPipe],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss'],
})
export class ContactsComponent implements OnInit, AfterViewInit, OnDestroy {
  // ==================== КОНТАКТНАЯ ИНФОРМАЦИЯ ====================
  readonly phones = [
    '+7 (3852) 555-861',
    '+7 (3852) 555-862',
    '+7 (3852) 555-863',
    '+7 903 937 31 10',
  ];
  readonly whatsapp = '+7 905 084-51-88';
  readonly email = 'paketon@bk.ru';
  readonly vk = 'https://vk.com';
  readonly telegram = 'https://t.me';
  readonly address = 'г. Барнаул, Попова, 165Б';

  // ==================== ОПЕРАТОРЫ ====================
  readonly operators = [
    { name: 'Ольга', phone: '8 3852 55 58 61', email: 'paketon@bk.ru' },
    { name: 'Надежда', phone: '8 3852 55 58 62', email: 'paketon@bk.ru' },
    { name: 'Елена', phone: '8 3852 55 58 63', email: 'paketon@bk.ru' },
    { name: 'Алексей', phone: '8 905 084 51 88', email: 'paketon@bk.ru' },
  ];

  // ==================== ДАННЫЕ МАГАЗИНОВ ====================
  allStores: Store[] = [];
  filteredStores: Store[] = [];
  cities: string[] = [];
  selectedCity = 'Барнаул';
  selectedCategory: StoreCategory = 'Магазин';
  readonly jobCategories: StoreCategory[] = ['Магазин', 'Склад', 'Офис'];

  // ==================== КАРТА ====================
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  private map: any;
  private placemarks: any[] = [];
  private mapInitialized = false;

  // ==================== ФОРМА ====================
  form = { name: '', email: '', message: '' };
  isSubmitting = false;

  // ==================== СОСТОЯНИЯ ====================
  isLoading = false;
  private destroy$ = new Subject<void>();
  private subscriptions: Subscription[] = [];

  constructor(public storeService: StoreService) {}

  // ==================== ЖИЗНЕННЫЙ ЦИКЛ ====================

  ngOnInit(): void {
    this.loadStores();
  }

  ngAfterViewInit(): void {
    this.loadYandexMaps();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.map) {
      this.map.destroy();
    }
  }

  // ==================== ЗАГРУЗКА ДАННЫХ ====================

  private loadStores(): void {
    this.isLoading = true;

    const sub = this.storeService.getAllStores().subscribe({
      next: (stores) => {
        this.allStores = stores;
        this.cities = this.storeService.getCities(stores);
        this.updateFilteredStores();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки магазинов:', error);
        this.isLoading = false;
      }
    });

    this.subscriptions.push(sub);
  }

  private loadYandexMaps(): void {
    if (typeof ymaps === 'undefined') {
      console.warn('Yandex Maps API не загружен.');
      return;
    }

    ymaps.ready(() => {
      this.mapInitialized = true;
      this.initializeMap();
    });
  }

  // ==================== ОБНОВЛЕНИЕ ДАННЫХ ====================

  private updateFilteredStores(): void {
    let filtered = this.allStores;

    if (this.selectedCategory === 'Магазин') {
      filtered = filtered.filter(store => store.address.city === this.selectedCity);
    }

    const typeMap: Record<StoreCategory, number> = {
      'Магазин': 0,
      'Склад': 1,
      'Офис': 2,
    };

    filtered = filtered.filter(store => store.productPlaceType === typeMap[this.selectedCategory]);
    this.filteredStores = filtered;

    if (this.mapInitialized) {
      this.updateMapPlacemarks();
    }
  }

  // ==================== КАРТА ====================

  private initializeMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    const coordinates = this.storeService.getCityCoordinates(this.selectedCity);

    this.map = new ymaps.Map(this.mapContainer.nativeElement, {
      center: coordinates,
      zoom: 11,
      controls: ['zoomControl', 'searchControl', 'geolocationControl'],
    });

    this.updateMapPlacemarks();
  }

  private updateMapPlacemarks(): void {
    if (!this.map) return;

    this.map.geoObjects.removeAll();
    this.placemarks = [];

    this.filteredStores.forEach(store => {
      const coords = [store.address.latitude, store.address.longitude];

      const placemark = new ymaps.Placemark(
        coords,
        {
          hintContent: store.shortName,
          balloonContent: this.createBalloonContent(store),
        },
        { preset: 'islands#greenIcon' }
      );

      this.map.geoObjects.add(placemark);
      this.placemarks.push(placemark);
    });

    if (this.filteredStores.length > 0) {
      const firstStore = this.filteredStores[0];
      this.map.setCenter(
        [firstStore.address.latitude, firstStore.address.longitude],
        12,
        { duration: 300 }
      );
    } else {
      const coordinates = this.storeService.getCityCoordinates(this.selectedCity);
      this.map.setCenter(coordinates, 11);
    }
  }

  private createBalloonContent(store: Store): string {
    const address = this.storeService.getFullAddress(store);
    const phone = store.phoneNumber
      ? `<a href="tel:${store.phoneNumber}">${store.phoneNumber}</a>`
      : '';
    const schedule = this.storeService.formatSchedule(store);
    const isOpen = this.storeService.isOpenNow(store);

    let statusHtml = '';
    if (isOpen !== null) {
      const color = isOpen ? '#10b981' : '#dc2626';
      const text = isOpen ? 'Открыто' : 'Закрыто';
      statusHtml = `<div style="display:inline-block;padding:4px 10px;border-radius:12px;background:${color}20;color:${color};font-weight:600;font-size:12px;margin-top:8px;">${text}</div>`;
    }

    return `
      <div style="font-family:Inter,sans-serif;min-width:200px;">
        <h3 style="margin:0 0 8px;font-size:16px;color:#111827;">${store.shortName}</h3>
        <p style="margin:4px 0;font-size:13px;"><strong>Адрес:</strong> ${address}</p>
        ${phone ? `<p style="margin:4px 0;font-size:13px;"><strong>Телефон:</strong> ${phone}</p>` : ''}
        ${schedule ? `<p style="margin:4px 0;font-size:13px;"><strong>Режим работы:</strong> ${schedule}</p>` : ''}
        ${statusHtml}
      </div>
    `;
  }

  // ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

  onCityChange(): void {
    this.updateFilteredStores();
  }

  selectCategory(category: StoreCategory): void {
    this.selectedCategory = category;
    if (category === 'Офис' || category === 'Склад') {
      this.selectedCity = 'Барнаул';
    }
    this.updateFilteredStores();
  }

  selectStore(store: Store): void {
    if (!this.map) return;

    const coords = [store.address.latitude, store.address.longitude];
    this.map.setCenter(coords, 15, { duration: 300 });

    this.placemarks.forEach(placemark => {
      placemark.options.set('preset', 'islands#greenIcon');
    });

    const selectedIndex = this.filteredStores.findIndex(s => s.id === store.id);
    if (selectedIndex >= 0 && this.placemarks[selectedIndex]) {
      this.placemarks[selectedIndex].options.set('preset', 'islands#redIcon');
      this.placemarks[selectedIndex].balloon.open();
    }
  }

  onSubmit(): void {
    if (!this.form.name || !this.form.email || !this.form.message) {
      this.showNotification('Заполните все поля формы', 'error');
      return;
    }

    this.isSubmitting = true;
    setTimeout(() => {
      console.log('Форма отправлена:', this.form);
      this.showNotification('Спасибо! Ваше сообщение отправлено.', 'success');
      this.form = { name: '', email: '', message: '' };
      this.isSubmitting = false;
    }, 1000);
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const icons = { success: '✅', error: '❌' };
    console.log(`${icons[type]} ${message}`);
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

  getFullAddress(store: Store): string {
    return this.storeService.getFullAddress(store);
  }

  getStoreSchedule(store: Store): string {
    return this.storeService.formatSchedule(store);
  }

  isStoreOpen(store: Store): boolean | null {
    return this.storeService.isOpenNow(store);
  }
}