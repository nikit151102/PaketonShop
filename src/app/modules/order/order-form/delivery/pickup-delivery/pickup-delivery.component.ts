import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, AfterViewInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, BehaviorSubject, combineLatest } from 'rxjs';
import { ProductPlace, StoreHoursInfo, TodaySchedule } from '../../../../../../models/product-place.interface';
import { ProductPlaceService } from '../../../../../core/api/product-place.service';

declare const ymaps: any;
type ViewMode = 'city' | 'list' | 'map' | any;

@Component({
  selector: 'app-pickup-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pickup-delivery.component.html',
  styleUrls: ['./pickup-delivery.component.scss']
})
export class PickupDeliveryComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() selectedStoreId: string | null = null;
  @Input() orderData: any;
  @Output() storeSelected = new EventEmitter<any>();
  @Output() storeUnselected = new EventEmitter<void>();
  @Output() allStoresOut = new EventEmitter<any>();
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  // Яндекс.Карты
  private ymap: any = null;
  private mapMarkers: any[] = [];
  private userMarker: any = null;
  private selectedMarker: any = null;

  // Состояния UI
  viewMode: ViewMode = 'city';
  selectedCity: string | null = null;
  searchQuery: string = '';
  showOnlyOpen: boolean = false;

  // Данные
  cities: string[] = [];
  allStores: ProductPlace[] = []; // Все магазины с сервера
  stores: ProductPlace[] = []; // Магазины в выбранном городе
  filteredStores: ProductPlace[] = []; // Отфильтрованные магазины
  selectedStore: ProductPlace | null = null;

  // UI состояния
  loading = false;
  loadingAllStores = false; // Флаг загрузки всех магазинов
  loadingCities = false;
  loadingStores = false;
  error: string | null = null;
  useGeolocation = false;
  userLocation: { lat: number; lng: number } | null = null;

  // Для карты
  mapCenter: { lat: number; lng: number } = { lat: 55.7558, lng: 37.6173 }; // Москва по умолчанию
  mapZoom = 10;
  mapReady = false;

  // BehaviorSubject для данных
  private storesSubject = new BehaviorSubject<ProductPlace[]>([]);

  private destroy$ = new Subject<void>();

  constructor(
    private productPlaceService: ProductPlaceService,
    private renderer: Renderer2
  ) { }

  ngOnChanges(changes: any): void {
    if (changes['orderData']) {
      const value = changes['orderData'].currentValue;

      console.log('📦 orderData изменился:', value);

      // Обрабатываем только если:
      // 1. Есть значение
      // 2. Магазины уже загружены (или это первый вызов)
      // 3. Это не первый change (чтобы не дублировать)
      if (value && (!this.loadingAllStores || changes['orderData'].firstChange)) {
        this.handleExternalStoreSelect(value);
      } else if (value && this.loadingAllStores) {
        // Откладываем, если магазины ещё грузятся
        this.pendingStoreSelect = value;
      }
    }

    if (changes['isDeliveryCancelled']) {
      setTimeout(() => { }, 100);
    }
  }


  ngOnInit(): void {
    // Сначала загружаем все магазины
    this.loadAllStores();

    if (this.selectedStoreId) {
      this.loadSelectedStore();
    }
  }

  ngAfterViewInit(): void {
    // Инициализируем Яндекс.Карты после загрузки компонента и проверяем контейнер
    setTimeout(() => {
      if (this.mapContainer?.nativeElement) {
        this.initYandexMap();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Очищаем карту при уничтожении компонента
    if (this.ymap) {
      this.ymap.destroy();
    }
  }


  /**
   * Обработка внешнего выбора магазина (из parent-компонента)
   */
  private handleExternalStoreSelect(value: any): void {
    console.log('🎯 Обработка внешнего выбора магазина:', value);

    let targetStore: ProductPlace | null = null;

    // === Вариант 1: Пришёл просто ID (строка) ===
    if (typeof value === 'string') {
      targetStore = this.allStores.find(s => s.id === value) || null;
    }

    // === Вариант 2: Пришёл объект ProductPlace ===
    else if (value?.address?.latitude && value?.address?.longitude && value?.storeSchedule) {
      // Это полноценный объект магазина
      targetStore = value as ProductPlace;

      // Добавляем в список, если нет
      if (!this.allStores.find(s => s.id === targetStore!.id)) {
        this.allStores.push(targetStore!);
      }
    }

    // === Вариант 3: Пришёл объект заказа с address/productPlace ===
    else if (value?.address || value?.productPlace) {
      console.log('📦 Получен объект заказа, извлекаем данные магазина...');

      // Пробуем найти по productPlace (если есть)
      if (value.productPlace) {
        targetStore = this.allStores.find(s => s.id === value.productPlace.id) || null;
      }

      // Если не нашли по productPlace, пробуем найти по совпадению адреса
      if (!targetStore && value.address) {
        const orderAddress = value.address;

        targetStore = this.allStores.find(s =>
          s.address?.city?.toLowerCase() === orderAddress.city?.toLowerCase() &&
          s.address?.street?.toLowerCase() === orderAddress.street?.toLowerCase() &&
          s.address?.house === orderAddress.house
        ) || null;

        if (targetStore) {
          console.log('✅ Магазин найден по совпадению адреса:', targetStore.shortName);
        }
      }

      // Если всё ещё не нашли — создаём полноценный объект из данных заказа
      if (!targetStore && value.address?.city && value.address?.street) {
        console.log('⚠️ Магазин не найден, создаём полноценный объект из адреса заказа');

        // Генерируем ID, если нет
        const storeId = value.address?.id || value.productPlace?.id || `temp-${Date.now()}`;

        targetStore = {
          id: storeId,
          shortName: `${value.address.city}, ${value.address.street}`,
          fullName: this.buildFullNameFromAddress(value.address),
          email: null,
          phoneNumber: value.phoneNumber || null,
          productPlaceType: 0,
          isDeliveryIncluded: false,
          getInstructions: [],
          advantageList: [],
          address: {
            id: value.address.id || `addr-${Date.now()}`, // ✅ Важно: address.id должен быть!
            region: value.address.region || null,
            area: value.address.area || null,
            city: value.address.city,
            street: value.address.street,
            house: value.address.house,
            housing: value.address.housing || null,
            floorNumber: value.address.floorNumber || null,
            office: value.address.office || null,
            postIndex: value.address.postIndex || null,
            latitude: value.address.latitude || null,
            longitude: value.address.longitude || null,
            system: value.address.system || 'web',
            transportCompanyType: null,
            isDeleted: false
          },
          // ✅ Создаём заглушку для storeSchedule
          storeSchedule: {
            id: `schedule-${storeId}`,
            storeId: storeId,
            workingHours: [], // Можно добавить дефолтные часы, если известны
            exceptionDays: [],
            isDeleted: false
          },
          partner: null,
          imageInstanceLinks: [],
          imageInstances: [],
          isDeleted: false
        } as ProductPlace;

        // Добавляем в список, чтобы не создавать каждый раз
        if (!this.allStores.find(s => s.id === targetStore!.id)) {
          this.allStores.push(targetStore!);
        }
      }
    }

    // === Применяем выбор ===
    if (targetStore) {
      console.log('✅ Выбираем магазин:', targetStore.shortName);

      // ✅ Используем тот же метод selectStore, что и при ручном выборе
      this.selectStore(targetStore);
    } else {
      console.warn('⚠️ Не удалось найти магазин для:', value);

      // Если магазины ещё загружаются — откладываем обработку
      if (this.loadingAllStores) {
        console.log('⏳ Магазины ещё загружаются, откладываем...');
        this.pendingStoreSelect = value;
      } else {
        // Пробуем загрузить конкретный магазин с сервера (если есть ID)
        const storeId = value?.id || value?.productPlace?.id || value?.address?.id;
        if (storeId) {
          console.log('🔄 Пробуем загрузить магазин с сервера:', storeId);
          this.loadStoreById(storeId);
        }
      }
    }
  }

  /**
   * Вспомогательный метод: построение fullName из адреса
   */
  private buildFullNameFromAddress(address: any): string {
    const parts: string[] = [];
    if (address.city) parts.push(`г. ${address.city}`);
    if (address.street) parts.push(`ул. ${address.street}`);
    if (address.house) parts.push(`д. ${address.house}`);
    if (address.housing) parts.push(`корп. ${address.housing}`);
    return parts.join(', ');
  }

  /**
   * Загрузка конкретного магазина по ID с сервера
   */
  private loadStoreById(storeId: string): void {
    this.productPlaceService.getProductPlaceById(storeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (store) => {
          if (store) {
            // Добавляем в общий список
            if (!this.allStores.find(s => s.id === store.id)) {
              this.allStores.push(store);
            }
            // Выбираем
            this.selectStore(store);
          }
        },
        error: (err) => {
          console.error('❌ Не удалось загрузить магазин:', err);
        }
      });
  }

  // Добавьте это свойство в класс для отложенной обработки
  private pendingStoreSelect: any = null;

  // Загрузка всех магазинов с сервера
  private loadAllStores(): void {
    this.loadingAllStores = true;
    this.error = null;

    this.productPlaceService.getAllProductPlaces()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stores: ProductPlace[]) => {
          this.allStores = stores || [];
          this.storesSubject.next(stores || []);
          this.allStoresOut.emit(this.allStores);

          this.loadCities();
          this.loadingAllStores = false;

          if (this.pendingStoreSelect) {
            console.log('🔄 Обрабатываем отложенный storeSelect:', this.pendingStoreSelect);
            this.handleExternalStoreSelect(this.pendingStoreSelect);
            this.pendingStoreSelect = null;
          }
        },
        error: (err) => {
          this.error = 'Не удалось загрузить список магазинов';
          this.loadingAllStores = false;

          // Пробуем повторную загрузку через 5 секунд
          setTimeout(() => {
            if (!this.allStores.length) {
              this.loadAllStores();
            }
          }, 5000);
        }
      });
  }

  // Загрузка всех уникальных городов из загруженных магазинов
  private loadCities(): void {
    if (this.allStores.length === 0) {
      this.cities = [];
      return;
    }

    this.loadingCities = true;

    // Получаем уникальные города из загруженных магазинов
    const uniqueCities = this.getUniqueCities(this.allStores);
    this.cities = uniqueCities.sort();

    this.loadingCities = false;
  }

  // Метод для получения уникальных городов из массива магазинов
  private getUniqueCities(stores: ProductPlace[]): string[] {
    const cities = new Set<string>();

    stores.forEach(store => {
      if (store.address?.city && store.address.city.trim()) {
        cities.add(store.address.city.trim());
      }
    });

    return Array.from(cities);
  }

  // Инициализация Яндекс.Карт
  private initYandexMap(): void {
    // Проверяем, есть ли контейнер
    if (!this.mapContainer?.nativeElement) {
      return;
    }

    if (typeof ymaps === 'undefined') {
      this.error = 'Карты временно недоступны';
      return;
    }

    ymaps.ready(() => {
      try {
        this.mapReady = true;

        // Создаем карту с проверкой контейнера
        const mapElement = this.mapContainer.nativeElement;
        if (!mapElement) {
          throw new Error('Контейнер карты не найден в DOM');
        }

        // Очищаем контейнер перед инициализацией
        this.renderer.setProperty(mapElement, 'innerHTML', '');

        this.ymap = new ymaps.Map(mapElement, {
          center: [this.mapCenter.lat, this.mapCenter.lng],
          zoom: this.mapZoom,
          controls: ['zoomControl', 'fullscreenControl']
        }, {
          suppressMapOpenBlock: true
        });

        // Добавляем пользовательские элементы управления
        this.ymap.controls.add(new ymaps.control.SearchControl({
          options: {
            provider: 'yandex#search',
            noPlacemark: true
          }
        }));

        // Если уже есть выбранный магазин, центрируем карту на нем
        if (this.selectedStore) {
          this.centerMapOnStore(this.selectedStore);
        }

        // Если уже есть магазины, добавляем маркеры
        if (this.stores.length > 0) {
          setTimeout(() => {
            this.addStoreMarkers();
          }, 300);
        }
      } catch (error) {
        this.error = 'Ошибка загрузки карты';
        this.mapReady = false;
      }
    });
  }

  // Выбор города
  selectCity(city: string): void {
    this.selectedCity = city;
    this.viewMode = 'list';
    this.loadStoresByCity(city);
  }

  // Загрузка магазинов по городу из уже загруженных данных
  loadStoresByCity(city: string): void {
    this.loadingStores = true;
    this.error = null;

    // Фильтруем магазины по городу из уже загруженных данных
    const storesInCity = this.allStores.filter(store =>
      store.address?.city?.toLowerCase() === city.toLowerCase()
    );

    this.stores = storesInCity;
    this.filteredStores = [...storesInCity];

    // Если в городе нет магазинов, показываем сообщение
    if (storesInCity.length === 0) {
      this.error = `В городе ${city} нет пунктов выдачи`;
      this.viewMode = 'city';
      this.loadingStores = false;
      return;
    }

    // Если есть координаты пользователя, сортируем по расстоянию
    if (this.userLocation) {
      this.sortStoresByDistance();
    }

    // Обновляем центр карты, если есть магазины с координатами
    const storeWithCoords = storesInCity.find(s => s.address?.latitude && s.address?.longitude);
    if (storeWithCoords) {
      this.mapCenter = {
        lat: storeWithCoords.address.latitude,
        lng: storeWithCoords.address.longitude
      };

      // Если карта уже инициализирована, обновляем центр
      if (this.mapReady && this.ymap) {
        this.ymap.setCenter([this.mapCenter.lat, this.mapCenter.lng], 12);
        this.addStoreMarkers();
      }
    }

    this.loadingStores = false;
  }

  loadSelectedStore(): void {
    if (!this.selectedStoreId) return;

    this.loading = true;

    // Сначала ищем в уже загруженных магазинах
    const storeFromCache = this.allStores.find(s => s.id === this.selectedStoreId);

    if (storeFromCache) {
      this.handleSelectedStore(storeFromCache);
      this.loading = false;
      return;
    }

    // Если не нашли в кэше, загружаем с сервера
    this.productPlaceService.getProductPlaceById(this.selectedStoreId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (store) => {
          if (store) {
            this.handleSelectedStore(store);
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
        }
      });
  }

  private handleSelectedStore(store: ProductPlace): void {
    this.selectedStore = store;
    this.selectedCity = store.address?.city || null;
    this.viewMode = 'city';

    // Если этого магазина нет в общем списке, добавляем его
    const existingStore = this.allStores.find(s => s.id === store.id);
    if (!existingStore) {
      this.allStores.push(store);
    }

    // Если город не в списке, добавляем его
    if (store.address?.city && !this.cities.includes(store.address.city)) {
      this.cities.push(store.address.city);
      this.cities.sort();
    }

    // Центрируем карту на выбранном магазине
    if (store.address?.latitude && store.address?.longitude && this.mapReady && this.ymap) {
      this.centerMapOnStore(store);
    }
  }

  // Методы для работы с Яндекс.Картами
  private addStoreMarkers(): void {
    if (!this.ymap || !this.mapReady) return;

    // Очищаем старые маркеры
    this.clearMarkers();

    this.stores.forEach(store => {
      if (store.address?.latitude && store.address?.longitude) {
        const marker = this.createStoreMarker(store);
        this.mapMarkers.push(marker);
        this.ymap.geoObjects.add(marker);
      }
    });

    // Автоматически подбираем масштаб карты
    if (this.mapMarkers.length > 0) {
      try {
        this.ymap.setBounds(this.ymap.geoObjects.getBounds(), {
          checkZoomRange: true,
          zoomMargin: 30
        });
      } catch (error) { }
    }
  }

  private createStoreMarker(store: ProductPlace): any {
    const isOpen = this.isStoreOpen(store);
    const isSelected = this.selectedStore?.id === store.id;

    // Создаем содержимое балуна
    const balloonContent = `
      <div class="store-balloon">
        <div class="balloon-header">
          <h4>${store.shortName || store.fullName}</h4>
          <span class="status ${isOpen ? 'open' : 'closed'}">
            ${isOpen ? 'Открыто' : 'Закрыто'}
          </span>
        </div>
        <div class="balloon-body">
          <p>${this.getFullAddress(store)}</p>
          <div class="balloon-details">
            <div>График: ${this.getTodaySchedule(store).openTime} - ${this.getTodaySchedule(store).closeTime}</div>
            ${this.userLocation ? `<div>Расстояние: ${this.formatDistance(this.getStoreDistance(store) || 0)}</div>` : ''}
          </div>
        </div>
        <div class="balloon-footer">
          <button class="select-btn" onclick="window.angularComponentRef?.selectStoreFromMap('${store.id}')">
            Выбрать
          </button>
        </div>
      </div>
    `;

    // Определяем цвет маркера
    let markerColor = isOpen ? 'green' : 'gray';
    if (isSelected) markerColor = 'red';

    // Создаем метку
    const marker = new ymaps.Placemark(
      [store.address.latitude, store.address.longitude],
      {
        balloonContent: balloonContent,
        hintContent: store.shortName || store.fullName
      },
      {
        iconLayout: 'default#image',
        iconImageHref: this.getMarkerIconUrl(markerColor),
        iconImageSize: [32, 32],
        iconImageOffset: [-16, -32],
        balloonCloseButton: true,
        hideIconOnBalloonOpen: false
      }
    );

    // Добавляем обработчик клика
    marker.events.add('click', (e: any) => {
      e.preventDefault();
      this.selectStoreFromMap(store);
    });

    return marker;
  }

  private getMarkerIconUrl(color: string): string {
    // Простые иконки для Яндекс.Карт
    const icons: Record<string, string> = {
      green: 'https://api-maps.yandex.ru/2.1/?lang=ru_RU#icon=islands#greenStretchyIcon',
      red: 'https://api-maps.yandex.ru/2.1/?lang=ru_RU#icon=islands#redStretchyIcon',
      gray: 'https://api-maps.yandex.ru/2.1/?lang=ru_RU#icon=islands#grayStretchyIcon',
      blue: 'https://api-maps.yandex.ru/2.1/?lang=ru_RU#icon=islands#blueStretchyIcon'
    };

    return icons[color] || icons['gray'];
  }

  private clearMarkers(): void {
    if (!this.ymap) return;

    this.mapMarkers.forEach(marker => {
      try {
        this.ymap.geoObjects.remove(marker);
      } catch (error) { }
    });
    this.mapMarkers = [];
  }

  private centerMapOnStore(store: ProductPlace): void {
    if (store.address?.latitude && store.address?.longitude && this.ymap) {
      this.ymap.setCenter([store.address.latitude, store.address.longitude], 15);

      // Выделяем выбранный маркер
      this.highlightSelectedMarker(store);
    }
  }

  private highlightSelectedMarker(store: ProductPlace): void {
    if (!this.ymap) return;

    // Сбрасываем предыдущий выделенный маркер
    if (this.selectedMarker) {
      const isOpen = this.isStoreOpen(store);
      const markerColor = isOpen ? 'green' : 'gray';
      this.selectedMarker.options.set('iconImageHref', this.getMarkerIconUrl(markerColor));
    }

    // Находим и выделяем новый маркер
    const marker = this.mapMarkers.find(m => {
      try {
        const coords = m.geometry.getCoordinates();
        return Math.abs(coords[0] - (store.address?.latitude || 0)) < 0.0001 &&
          Math.abs(coords[1] - (store.address?.longitude || 0)) < 0.0001;
      } catch {
        return false;
      }
    });

    if (marker) {
      marker.options.set('iconImageHref', this.getMarkerIconUrl('red'));
      this.selectedMarker = marker;

      // Открываем балун
      setTimeout(() => {
        try {
          marker.balloon.open();
        } catch (error) { }
      }, 300);
    }
  }

  private addUserMarker(): void {
    if (!this.userLocation || !this.ymap) return;

    // Очищаем старый маркер пользователя
    if (this.userMarker) {
      this.ymap.geoObjects.remove(this.userMarker);
    }

    // Создаем новый маркер
    this.userMarker = new ymaps.Placemark(
      [this.userLocation.lat, this.userLocation.lng],
      {
        hintContent: 'Вы здесь',
        balloonContent: 'Ваше местоположение'
      },
      {
        iconLayout: 'default#image',
        iconImageHref: this.getMarkerIconUrl('blue'),
        iconImageSize: [32, 32],
        iconImageOffset: [-16, -32]
      }
    );

    this.ymap.geoObjects.add(this.userMarker);
  }

  // Методы для вызова из балуна
  selectStoreFromMap(store: ProductPlace): void {
    this.selectedStore = store;
    this.viewMode = 'city';
    this.storeSelected.emit({
      'type': 'pickup',
      'id': store.id,
      'addressId': store.address.id,
      'shopCity': store.address.city,
      'shopAddress': store.address
    });
    // Центрируем карту на выбранном магазине
    this.centerMapOnStore(store);
  }

  // Поиск и фильтрация
  onSearchQueryChange(): void {
    if (!this.searchQuery.trim()) {
      this.filteredStores = [...this.stores];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredStores = this.stores.filter(store =>
      store.fullName?.toLowerCase().includes(query) ||
      store.shortName?.toLowerCase().includes(query) ||
      store.address?.street?.toLowerCase().includes(query) ||
      store.address?.house?.toLowerCase().includes(query)
    );
  }

  toggleOpenOnly(): void {
    this.showOnlyOpen = !this.showOnlyOpen;

    if (this.showOnlyOpen) {
      this.filteredStores = this.stores.filter(store => this.isStoreOpen(store));
    } else {
      this.filteredStores = [...this.stores];
    }
  }

  // Работа с геолокацией (упрощенная версия)
  requestGeolocation(): void {
    if (!navigator.geolocation) {
      this.error = 'Геолокация не поддерживается вашим браузером';
      return;
    }

    this.useGeolocation = true;
    this.loading = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Обновляем центр карты
        this.mapCenter = { ...this.userLocation };

        if (this.mapReady && this.ymap) {
          this.ymap.setCenter([this.userLocation.lat, this.userLocation.lng], 13);
          this.addUserMarker();
        }

        // Сортируем магазины по расстоянию
        if (this.stores.length > 0) {
          this.sortStoresByDistance();
        }

        this.loading = false;
      },
      (error) => {
        this.error = 'Не удалось определить ваше местоположение';
        this.useGeolocation = false;
        this.loading = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  sortStoresByDistance(): void {
    if (!this.userLocation || this.stores.length === 0) return;

    this.stores.sort((a, b) => {
      const distA = this.calculateDistance(
        this.userLocation!.lat,
        this.userLocation!.lng,
        a.address?.latitude || 0,
        a.address?.longitude || 0
      );
      const distB = this.calculateDistance(
        this.userLocation!.lat,
        this.userLocation!.lng,
        b.address?.latitude || 0,
        b.address?.longitude || 0
      );
      return distA - distB;
    });

    this.filteredStores = [...this.stores];
  }

  // Выбор магазина
  selectStore(store: ProductPlace): void {
    this.selectedStore = store;
    this.selectedCity = store.address?.city || null;
    this.viewMode = 'city';

    this.storeSelected.emit({
      'type': 'pickup',
      'id': store.id,
      'addressId': store.address?.id || null, 
      'shopCity': store.address?.city || '',
      'shopAddress': store.address || null
    });

    // Центрируем карту на выбранном магазине
    if (store.address?.latitude && store.address?.longitude && this.mapReady && this.ymap) {
      this.centerMapOnStore(store);
    }
  }

  unselectStore(): void {
    this.selectedStore = null;
    this.selectedCity = null;
    this.viewMode = 'city';
    this.storeUnselected.emit();
  }

  // Переключение режимов просмотра
  switchToListView(): void {
    if (this.selectedCity) {
      this.viewMode = 'list';
    }
  }

  switchToMapView(): void {
    if (this.selectedCity && this.stores.length > 0) {
      this.viewMode = 'map';

      // Если карта еще не инициализирована, инициализируем
      if (!this.mapReady) {
        setTimeout(() => {
          this.initYandexMap();
        }, 100);
      }
    }
  }

  // Вспомогательные методы
  getStoreHoursInfo(store: ProductPlace): StoreHoursInfo[] {
    return this.productPlaceService.getStoreHoursInfo(store);
  }

  getTodaySchedule(store: ProductPlace): TodaySchedule {
    return this.productPlaceService.getTodaySchedule(store);
  }

  getFullAddress(store: ProductPlace): string {
    const addr = store.address;
    if (!addr) return 'Адрес не указан';

    return `${addr.street || ''} ${addr.house || ''}`.trim();
  }

  isStoreOpen(store: ProductPlace): boolean {
    const schedule = this.getTodaySchedule(store);
    return schedule?.isOpen || false;
  }

  getStoreDistance(store: ProductPlace): number | null {
    if (!this.userLocation || !store.address?.latitude) return null;

    return this.calculateDistance(
      this.userLocation.lat,
      this.userLocation.lng,
      store.address.latitude,
      store.address.longitude
    );
  }

  formatDistance(distance: number): string {
    if (distance < 1000) {
      return `${Math.round(distance)} м`;
    }
    return `${(distance / 1000).toFixed(1)} км`;
  }

  formatTime(time: string): string {
    return time?.slice(0, 5) || ''; // HH:mm
  }

  // Утилитарные методы
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Радиус Земли в метрах
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  // Навигация
  goBackToCitySelection(): void {
    this.selectedCity = null;
    this.selectedStore = null;
    this.viewMode = 'city';
    this.filteredStores = [];
    this.stores = [];

    // Очищаем маркеры на карте
    if (this.ymap) {
      this.clearMarkers();
    }
  }

  goBackToStoreList(): void {
    if (this.selectedCity) {
      this.viewMode = 'list';
      this.selectedStore = null;
    }
  }
}