import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { TodaySchedule, StoreHoursInfo } from '../../../models/product-place.interface';
import { ProductPlace } from '../../../models/shop.interface';
import { ProductPlaceService } from '../../core/api/product-place.service';

interface ShopDisplay {
  id: string;
  name: string;
  shortName: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  hours: string;
  status: 'open' | 'closed' | 'soon';
  statusText: string;
  isOpenNow: boolean;
  todaySchedule: TodaySchedule;
  openingTime: string;
  closingTime: string;
  features: string[];
  distance?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  scheduleInfo?: StoreHoursInfo[];
  partner?: {
    shortName: string;
    fullName: string;
    inn: string;
  };
  showSchedule?: boolean;
}

interface CityShops {
  city: string;
  region: string;
  shops: ShopDisplay[];
  expanded: boolean;
}

@Component({
  selector: 'app-shops',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './shops.component.html',
  styleUrls: ['./shops.component.scss'],
  animations: [
    trigger('notification', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class ShopsComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  private shopDisplayCache = new Map<string, ShopDisplay>();
  private searchSubject = new Subject<string>();
  private updateInterval: any;

  allStores: ProductPlace[] = [];
  loading = true;
  lastUpdateTime = new Date();

  // Отображение
  cities: CityShops[] = [];
  filteredCities: CityShops[] = [];
  uniqueCities: string[] = [];
  uniqueRegions: string[] = [];
  searchSuggestions: string[] = [];

  // Фильтры
  selectedCity: string | null = null;
  selectedRegion: string | null = null;
  searchQuery: string = '';
  showOnlyOpen = false;
  showPartnerOnly = false;
  viewMode: 'list' | 'grid' | 'map' = 'grid';

  // Геолокация
  userLocation: { latitude: number; longitude: number } | null = null;
  sortBy: 'name' | 'distance' | 'opening' = 'name';

  // UI состояния
  showScrollTop = false;

  constructor(
    private productPlaceService: ProductPlaceService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.setupSearchListener();
    this.loadStores();
    this.loadUserLocation();
    this.startUpdateTimer();

    // Слушаем скролл для кнопки "Наверх"
    window.addEventListener('scroll', this.onScroll.bind(this));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    clearInterval(this.updateInterval);
    window.removeEventListener('scroll', this.onScroll.bind(this));
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.showScrollTop = window.scrollY > 500;
  }

  setupSearchListener(): void {
    const searchSub = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        this.updateSearchSuggestions(query);
      });

    this.subscriptions.add(searchSub);
  }

  updateSearchSuggestions(query: string): void {
    if (!query.trim()) {
      this.searchSuggestions = [];
      return;
    }

    const suggestions = new Set<string>();
    const lowerQuery = query.toLowerCase();

    this.cities.forEach(city => {
      if (city.city.toLowerCase().includes(lowerQuery)) {
        suggestions.add(city.city);
      }

      city.shops.forEach(shop => {
        if (shop.name.toLowerCase().includes(lowerQuery)) {
          suggestions.add(shop.name);
        }
        if (shop.address.toLowerCase().includes(lowerQuery)) {
          suggestions.add(shop.address);
        }
      });
    });

    this.searchSuggestions = Array.from(suggestions).slice(0, 5);
  }

  startUpdateTimer(): void {
    this.updateInterval = setInterval(() => {
      this.lastUpdateTime = new Date();
      // Обновляем статусы магазинов каждую минуту
      this.updateShopStatuses();
    }, 60000);
  }

  updateShopStatuses(): void {
    this.cities.forEach(city => {
      city.shops.forEach(shop => {
        const newStatus = this.calculateShopStatus(shop);
        shop.status = newStatus.status;
        shop.statusText = newStatus.statusText;
        shop.isOpenNow = newStatus.isOpenNow;
      });
    });
  }

  loadStores(): void {
    this.loading = true;

    const storesSub = this.productPlaceService.getAllProductPlaces().subscribe({
      next: (stores: any) => {
        this.allStores = stores;
        this.prepareDisplayData();
        this.applyFilters();
        this.loading = false;
        this.lastUpdateTime = new Date();

      },
      error: (error: any) => {
        console.error('Ошибка загрузки магазинов:', error);
        this.loading = false;
      }
    });

    this.subscriptions.add(storesSub);
  }

  loadUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          if (this.allStores.length > 0) {
            this.prepareDisplayData();
          }
        },
        (error) => {
          console.warn('Не удалось получить геолокацию:', error);
        }
      );
    }
  }

  prepareDisplayData(): void {
    const shopsByCity = new Map<string, CityShops>();

    this.allStores.forEach(store => {
      const shopDisplay = this.convertToShopDisplay(store);
      const city = store.address?.city || 'Не указан';
      const region = store.address?.region || 'Не указан';

      const key = `${city}|${region}`;

      if (!shopsByCity.has(key)) {
        shopsByCity.set(key, {
          city,
          region,
          shops: [],
          expanded: false
        });
      }
      shopsByCity.get(key)!.shops.push(shopDisplay);
    });

    // Преобразуем и сортируем
    this.cities = Array.from(shopsByCity.values())
      .map(city => ({
        ...city,
        shops: this.sortShops(city.shops)
      }))
      .sort((a, b) => {
        if (a.region !== b.region) {
          return a.region.localeCompare(b.region);
        }
        return a.city.localeCompare(b.city);
      });

    this.uniqueCities = [...new Set(this.cities.map(c => c.city))].sort();
    this.uniqueRegions = [...new Set(this.cities.map(c => c.region))].sort();

    this.cdr.detectChanges();
  }

  convertToShopDisplay(store: any): ShopDisplay {
    const cacheKey = store.id;
    if (this.shopDisplayCache.has(cacheKey)) {
      return { ...this.shopDisplayCache.get(cacheKey)! };
    }

    const address = this.productPlaceService.getFullAddress(store);
    const todaySchedule = this.productPlaceService.getTodaySchedule(store);
    const scheduleInfo = this.productPlaceService.getStoreHoursInfo(store);

    const status = this.calculateShopStatusFromSchedule(todaySchedule);

    const features = this.extractFeatures(store);
    let distance: number | undefined;

    if (this.userLocation && store.address?.latitude && store.address?.longitude) {
      const storeLat = store.address.latitude;
      const storeLng = store.address.longitude;
      const userLat = this.userLocation.latitude;
      const userLng = this.userLocation.longitude;
      distance = this.calculateDistance(userLat, userLng, storeLat, storeLng);
    }

    const shopDisplay = {
      id: store.id,
      name: store.fullName || store.shortName,
      shortName: store.shortName,
      address: address,
      city: store.address?.city || 'Не указан',
      region: store.address?.region || '',
      phone: store.partner?.phone || '+7 (999) 999-99-99',
      email: store.partner?.email || 'info@company.ru',
      hours: this.getWorkingHoursString(scheduleInfo),
      status: status.status,
      statusText: status.statusText,
      isOpenNow: status.isOpenNow,
      todaySchedule,
      openingTime: todaySchedule.openTime || '',
      closingTime: todaySchedule.closeTime || '',
      features,
      distance,
      coordinates: store.address ? {
        latitude: store.address.latitude,
        longitude: store.address.longitude
      } : undefined,
      scheduleInfo,
      partner: store.partner ? {
        shortName: store.partner.shortName,
        fullName: store.partner.fullName,
        inn: store.partner.inn
      } : undefined,
      showSchedule: false
    };

    this.shopDisplayCache.set(cacheKey, shopDisplay);
    return shopDisplay;
  }

  calculateShopStatusFromSchedule(schedule: TodaySchedule): {
    status: 'open' | 'closed' | 'soon';
    statusText: string;
    isOpenNow: boolean;
  } {
    if (schedule.isOpen) {
      return {
        status: 'open',
        statusText: 'Открыто',
        isOpenNow: true
      };
    }

    if (schedule.openTime) {
      const now = new Date();
      const [openHours, openMinutes] = schedule.openTime.split(':').map(Number);
      const openTime = new Date();
      openTime.setHours(openHours, openMinutes, 0);

      if (openTime > now && (openTime.getTime() - now.getTime()) < 3600000) {
        return {
          status: 'soon',
          statusText: 'Скоро открытие',
          isOpenNow: false
        };
      }
    }

    return {
      status: 'closed',
      statusText: 'Закрыто',
      isOpenNow: false
    };
  }

  calculateShopStatus(shop: ShopDisplay): {
    status: 'open' | 'closed' | 'soon';
    statusText: string;
    isOpenNow: boolean;
  } {
    return this.calculateShopStatusFromSchedule(shop.todaySchedule);
  }

  extractFeatures(store: any): string[] {
    const features: string[] = [];
    if (store.partner) features.push('Официальный партнер');
    if (store.address?.office) features.push('Офис продаж');
    if (store.hasShowroom) features.push('Шоурум');
    if (store.hasDelivery) features.push('Доставка');
    if (store.hasParking) features.push('Парковка');
    return features;
  }

  getWorkingHoursString(scheduleInfo: StoreHoursInfo[]): string {
    const today = scheduleInfo.find(s => s.isToday);
    if (today && today.isWorkingDay) {
      return `${today.openTime} - ${today.closeTime}`;
    }
    const workingDays = scheduleInfo.filter(s => s.isWorkingDay);
    if (workingDays.length === 0) return 'По записи';

    const firstDay = workingDays[0];
    const lastDay = workingDays[workingDays.length - 1];
    return `${firstDay.dayName.slice(0, 3)}-${lastDay.dayName.slice(0, 3)}: ${firstDay.openTime}-${lastDay.closeTime}`;
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 1000);
  }

  toRad(value: number): number {
    return value * Math.PI / 180;
  }

  sortShops(shops: ShopDisplay[]): ShopDisplay[] {
    return [...shops].sort((a, b) => {
      if (this.sortBy === 'distance' && this.userLocation) {
        const distA = a.distance || Infinity;
        const distB = b.distance || Infinity;
        return distA - distB;
      } else if (this.sortBy === 'opening') {
        if (a.isOpenNow !== b.isOpenNow) {
          return a.isOpenNow ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }

  applyFilters(): void {
    let filtered = [...this.cities];

    if (this.selectedRegion) {
      filtered = filtered.filter(city => city.region === this.selectedRegion);
    }

    if (this.selectedCity) {
      filtered = filtered.filter(city => city.city === this.selectedCity);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered
        .map(city => ({
          ...city,
          shops: city.shops.filter(shop =>
            shop.name.toLowerCase().includes(query) ||
            shop.address.toLowerCase().includes(query) ||
            shop.city.toLowerCase().includes(query) ||
            (shop.partner?.fullName?.toLowerCase() || '').includes(query)
          )
        }))
        .filter(city => city.shops.length > 0);
    }

    if (this.showOnlyOpen) {
      filtered = filtered
        .map(city => ({
          ...city,
          shops: city.shops.filter(shop => shop.isOpenNow)
        }))
        .filter(city => city.shops.length > 0);
    }

    if (this.showPartnerOnly) {
      filtered = filtered
        .map(city => ({
          ...city,
          shops: city.shops.filter(shop => shop.partner)
        }))
        .filter(city => city.shops.length > 0);
    }

    this.filteredCities = filtered.map(city => ({
      ...city,
      shops: this.sortShops(city.shops)
    }));
  }

  // Методы для фильтров
  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
    this.applyFilters();
  }

  selectSearchSuggestion(suggestion: string): void {
    this.searchQuery = suggestion;
    this.searchSuggestions = [];
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSuggestions = [];
    this.applyFilters();
  }

  onRegionChange(region: string | null): void {
    this.selectedRegion = region;
    this.selectedCity = null;
    this.applyFilters();
  }

  onCityChange(city: string | null): void {
    this.selectedCity = city;
    this.applyFilters();
  }

  toggleOpenFilter(): void {
    this.showOnlyOpen = !this.showOnlyOpen;
    this.applyFilters();
  }

  togglePartnerFilter(): void {
    this.showPartnerOnly = !this.showPartnerOnly;
    this.applyFilters();
  }

  toggleSortDistance(): void {
    this.sortBy = this.sortBy === 'distance' ? 'name' : 'distance';
    this.applyFilters();
  }

  onViewModeChange(mode: 'list' | 'grid' | 'map'): void {
    this.viewMode = mode;
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedRegion || this.selectedCity || this.showOnlyOpen || this.showPartnerOnly);
  }

  clearRegionFilter(): void {
    this.selectedRegion = null;
    this.selectedCity = null;
    this.applyFilters();
  }

  clearCityFilter(): void {
    this.selectedCity = null;
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.selectedRegion = null;
    this.selectedCity = null;
    this.searchQuery = '';
    this.showOnlyOpen = false;
    this.showPartnerOnly = false;
    this.sortBy = 'name';
    this.searchSuggestions = [];
    this.applyFilters();
  }

  // Геттеры для статистики
  getOpenShopsCount(): number {
    return this.cities.reduce((total, city) =>
      total + city.shops.filter(shop => shop.isOpenNow).length, 0
    );
  }

  getTotalShops(): number {
    return this.cities.reduce((total, city) => total + city.shops.length, 0);
  }

  getPluralEnding(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) return '';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'а';
    return 'ов';
  }

  formatDistance(meters: number | undefined): string {
    if (!meters) return '';
    return meters < 1000 ? `${meters} м` : `${(meters / 1000).toFixed(1)} км`;
  }

  refreshStores(): void {
    this.loading = true;
    this.shopDisplayCache.clear();
    this.productPlaceService.clearCache();
    this.loadStores();
  }

  toggleCityExpansion(city: CityShops): void {
    city.expanded = !city.expanded;
  }

  toggleShopSchedule(shop: ShopDisplay): void {
    shop.showSchedule = !shop.showSchedule;
  }

  getCityOpenShopsCount(shops: ShopDisplay[]): number {
    return shops.filter(shop => shop.isOpenNow).length;
  }

  isClosingSoon(shop: ShopDisplay): boolean {
    if (!shop.isOpenNow || !shop.closingTime) return false;

    const now = new Date();
    const [closeHours, closeMinutes] = shop.closingTime.split(':').map(Number);
    const closeTime = new Date();
    closeTime.setHours(closeHours, closeMinutes, 0);

    // Если до закрытия меньше часа
    return (closeTime.getTime() - now.getTime()) < 3600000;
  }

  getRandomPosition(index: number): { x: number; y: number } {
    const seed = index * 0.618033988749895;
    return {
      x: 10 + (Math.sin(seed * Math.PI * 2) * 40 + 50) % 80,
      y: 10 + (Math.cos(seed * Math.PI * 2) * 40 + 50) % 80
    };
  }

  // Метод для построения маршрута
  getDirections(shop: ShopDisplay): void {
    if (shop.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.coordinates.latitude},${shop.coordinates.longitude}`;
      window.open(url, '_blank');
    } else {
      // this.displayNotification('Координаты магазина не указаны', 'warning');
    }
  }


  trackByCity(index: number, city: CityShops): string {
    return city.city + city.region;
  }

  trackByShopId(index: number, shop: ShopDisplay): string {
    return shop.id;
  }

  // Метод для подсчета отфильтрованных населенных пунктов
  getFilteredLocationsCount(): number {
    return this.filteredCities.length;
  }

  // Метод для подсчета отфильтрованных магазинов
  getFilteredShopsCount(): number {
    let count = 0;
    for (const city of this.filteredCities) {
      count += city.shops.length;
    }
    return count;
  }

  // Метод для подсчета открытых отфильтрованных магазинов
  getFilteredOpenShopsCount(): number {
    let count = 0;
    for (const city of this.filteredCities) {
      for (const shop of city.shops) {
        if (shop.isOpenNow) {
          count++;
        }
      }
    }
    return count;
  }

  // Метод для скролла наверх
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getVisibleCities(): CityShops[] {
    return this.cities.slice(0, 30);
  }

  hasOpenShopsInCity(city: CityShops): boolean {
    return city.shops.some(shop => shop.isOpenNow);
  }
}