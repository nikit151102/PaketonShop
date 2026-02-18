import { Component, OnInit } from '@angular/core';
import { LocationService, City, DistrictGroup, DeliveryAddress, SelectedStore, StoreSelectionState } from './location.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';
import { UserDataService } from '../../services/user-data.service';
import { ProductPlaceService } from '../../api/product-place.service';

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [CommonModule, FormsModule, AsyncPipe],
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss'],
})
export class LocationComponent implements OnInit {

  city$ = new BehaviorSubject<City | null>(null);
  detectedCity$ = new BehaviorSubject<string>('');
  showCityModal$ = new BehaviorSubject<boolean>(false);
  showStoreModal$ = new BehaviorSubject<boolean>(false);
  showAddressModal$ = new BehaviorSubject<boolean>(false);

  stores$ = new BehaviorSubject<any[]>([]);
  selectedStore$ = new BehaviorSubject<any | null>(null);
  storeSelectionState$ = new BehaviorSubject<StoreSelectionState>({ type: 'all' });
  storesLoading$ = new BehaviorSubject<boolean>(false);
  filteredStores: any[] = [];
  filteredAndSearchedStores: any[] = [];

  // Сохраненные данные
  savedCity$ = new BehaviorSubject<City | null>(null);
  savedAddress$ = new BehaviorSubject<DeliveryAddress | null>(null);
  savedStore$ = new BehaviorSubject<SelectedStore | null>(null);

  // Для адреса доставки
  deliveryAddress: any = {
    street: '',
    house: '',
    apartment: '',
    entrance: '',
    floor: '',
    intercom: '',
    comment: ''
  };

  // Для подсветки выбранного элемента
  selectedCityId: string | null = null;
  selectedDistrictId: string | null = null;
  selectedStoreId: string | null = null;

  currentDay: number = new Date().getDay();

  // Поиск по магазинам
  storeSearchTerm: string = '';
  private searchSubject = new BehaviorSubject<string>('');

  // Сохраненные адреса
  savedAddresses: DeliveryAddress[] = [];

  // Подсказки адресов
  addressSuggestions: string[] = [];

  // Состояние сохранения
  isSavingAddress: boolean = false;
  showAddressErrors: boolean = false;

  // Кэш количества магазинов по городам
  private storeCountCache: Map<string, number> = new Map();

  constructor(
    public locationService: LocationService,
    private userDataService: UserDataService,
    public productPlaceService: ProductPlaceService
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Подписка на магазины
    this.productPlaceService.productPlaces$.subscribe(stores => {
      this.stores$.next(stores);
      this.updateStoreCountCache(stores);
      this.filterStores();
    });

    this.productPlaceService.loading$.subscribe(loading => {
      this.storesLoading$.next(loading);
    });

    // Подписка на изменения города
    this.locationService.city$.subscribe(city => {
      this.city$.next(city);
      this.selectedCityId = city?.id || null;
      if (city) {
        this.userDataService.setCity(city.name);
        this.loadStoresForCity(city.name);
      }
    });

    // Подписка на модалки
    this.locationService.showCityModal$.subscribe(show => {
      this.showCityModal$.next(show);
    });

    this.locationService.showStoreModal$.subscribe(show => {
      this.showStoreModal$.next(show);
      if (show) {
        this.storeSearchTerm = '';
        this.loadStoresForCity(this.city$.getValue()?.name || '');
      }
    });

    this.locationService.showAddressModal$.subscribe(show => {
      this.showAddressModal$.next(show);
      if (show) {
        this.loadSavedAddresses();
        const savedAddress = this.locationService.getCurrentAddress();
        if (savedAddress) {
          this.deliveryAddress = { ...savedAddress };
        } else {
          this.resetAddressForm();
        }
      }
    });

    // Подписка на состояние выбора магазина
    this.locationService.storeSelectionState$.subscribe(state => {
      this.storeSelectionState$.next(state);
      if (state.type === 'single' && state.storeId) {
        this.selectedStoreId = state.storeId;
        const store = this.filteredStores.find(s => s.id === state.storeId);
        this.selectedStore$.next(store || null);
      } else {
        this.selectedStoreId = null;
        this.selectedStore$.next(null);
      }
    });

    // Поиск с debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyStoreSearch();
    });

    // Фильтрация магазинов по городу
    combineLatest([this.stores$, this.city$]).subscribe(([stores, city]) => {
      if (city && stores.length) {
        this.filteredStores = stores.filter(store =>
          store.address?.city?.toLowerCase().includes(city.name.toLowerCase())
        );

        // Добавляем случайные расстояния для демо
        this.filteredStores = this.filteredStores.map(store => ({
          ...store,
          distance: (Math.random() * 5 + 0.5).toFixed(1)
        }));

        // Проверяем, есть ли сохраненный магазин среди доступных
        const savedStore = this.locationService.getCurrentStore();
        if (savedStore) {
          const matchedStore = this.filteredStores.find(s => s.id === savedStore.id);
          if (matchedStore) {
            this.selectedStoreId = matchedStore.id;
            this.selectedStore$.next(matchedStore);
          }
        }
      } else {
        this.filteredStores = stores;
      }
      this.applyStoreSearch();
    });
  }

  async ngOnInit() {
    await this.locationService.init();

    const deviceCity = this.userDataService.getCurrentCity();
    this.detectedCity$.next(deviceCity);

    // Проверяем, есть ли сохраненный город
    const savedCity = this.locationService.getCurrentCity();
    if (savedCity) {
      this.city$.next(savedCity);
      this.selectedCityId = savedCity.id || null;
      this.userDataService.setCity(savedCity.name);
      this.loadStoresForCity(savedCity.name);
    } else {
      // Если нет сохраненного города, пытаемся определить по устройству
      const allCities = this.locationService.getAvailableCities();
      const matchedCity = allCities.find((city: any) =>
        city.name.toLowerCase().includes(deviceCity.toLowerCase()) ||
        deviceCity.toLowerCase().includes(city.name.toLowerCase())
      );

      if (matchedCity) {
        this.city$.next(matchedCity);
        this.selectedCityId = matchedCity.id || null;
        this.locationService.setCity(matchedCity);
        this.userDataService.setCity(matchedCity.name);
        this.loadStoresForCity(matchedCity.name);
      }
    }

    // Загружаем сохраненные адреса
    this.loadSavedAddresses();
  }

  loadStoresForCity(cityName: string) {
    if (cityName) {
      this.productPlaceService.getAllProductPlaces(100).subscribe();
    }
  }

  private updateStoreCountCache(stores: any[]) {
    this.storeCountCache.clear();
    stores.forEach(store => {
      const city = store.address?.city;
      if (city) {
        const count = this.storeCountCache.get(city) || 0;
        this.storeCountCache.set(city, count + 1);
      }
    });
  }

  getStoreCountForCity(city: City): number {
    return this.storeCountCache.get(city.name) || 0;
  }

  openCityListModal() {
    this.locationService.openCityListModal();
  }

  openStoreModal() {
    this.locationService.openStoreModal();
  }

  setCity(city: City) {
    this.selectedCityId = city.id || null;
    this.locationService.setCity(city);
    this.userDataService.setCity(city.name);

    // При смене города сбрасываем выбор магазина
    this.locationService.clearSelectedStore();
    this.selectedStoreId = null;
    this.selectedStore$.next(null);

    // Закрываем модалку города
    setTimeout(() => {
      this.locationService.showCityModal$.next(false);
    }, 300);
  }

  setStore(store: any) {
    this.selectedStoreId = store.id;
    this.selectedStore$.next(store);
    this.locationService.saveSelectedStore(store);
    this.locationService.closeStoreModal();

    // Показываем уведомление (можно добавить сервис уведомлений)
    console.log(`Выбран магазин: ${store.fullName}`);
  }

  setShowAllStores() {
    this.locationService.setShowAllStores();
    this.selectedStoreId = null;
    this.selectedStore$.next(null);
    this.locationService.closeStoreModal();
    console.log('Показаны товары во всех магазинах города');
  }

  confirmCity() {
    this.locationService.confirmCity();
    const city = this.locationService.getCurrentCity();
    if (city) {
      this.userDataService.setCity(city.name);
      this.selectedCityId = city.id || null;
    }
  }

  skipStoreSelection() {
    this.locationService.closeStoreModal();

    if (this.filteredStores.length === 0) {
      setTimeout(() => this.openAddressModal(), 300);
    } else {
      this.setShowAllStores();
    }
  }

  // Открыть модалку адреса
  openAddressModal() {
    this.locationService.openAddressModal();
  }

  // Закрыть модалку адреса
  closeAddressModal() {
    this.locationService.closeAddressModal();
    this.showAddressErrors = false;
    this.addressSuggestions = [];
  }

  // Сохранить адрес доставки
  async saveAddress() {
    this.showAddressErrors = true;

    if (!this.deliveryAddress.street || !this.deliveryAddress.house) {
      return;
    }

    this.isSavingAddress = true;

    // Имитация задержки сохранения
    setTimeout(() => {
      this.locationService.saveDeliveryAddress(this.deliveryAddress);

      // Сохраняем в список сохраненных адресов
      this.saveAddressToHistory(this.deliveryAddress);

      this.isSavingAddress = false;
      this.closeAddressModal();
      console.log('Адрес доставки сохранен:', this.deliveryAddress);

      // Показываем уведомление
    }, 500);
  }

  // Сохранить адрес в историю
  private saveAddressToHistory(address: DeliveryAddress) {
    const addressKey = `${address.street}, ${address.house}`;
    const saved = localStorage.getItem('saved_addresses');
    let addresses: DeliveryAddress[] = saved ? JSON.parse(saved) : [];

    // Проверяем, есть ли уже такой адрес
    const exists = addresses.some(a =>
      a.street === address.street && a.house === address.house
    );

    if (!exists) {
      addresses.unshift(address);
      // Ограничиваем количество сохраненных адресов
      if (addresses.length > 5) {
        addresses = addresses.slice(0, 5);
      }
      localStorage.setItem('saved_addresses', JSON.stringify(addresses));
      this.savedAddresses = addresses;
    }
  }

  // Загрузить сохраненные адреса
  loadSavedAddresses() {
    const saved = localStorage.getItem('saved_addresses');
    this.savedAddresses = saved ? JSON.parse(saved) : [];
  }

  // Загрузить сохраненный адрес
  loadSavedAddress(address: DeliveryAddress) {
    this.deliveryAddress = { ...address };
    this.addressSuggestions = [];
  }

  // Сбросить форму адреса
  resetAddressForm() {
    this.deliveryAddress = {
      street: '',
      house: '',
      apartment: '',
      entrance: '',
      floor: '',
      intercom: '',
      comment: ''
    };
  }

  // Выбрать подсказку адреса
  selectAddressSuggestion(suggestion: string) {
    this.deliveryAddress.street = suggestion;
    this.addressSuggestions = [];

    // Фокус на поле дома
    setTimeout(() => {
      const houseInput = document.getElementById('house');
      if (houseInput) {
        houseInput.focus();
      }
    }, 100);
  }

  // Поиск подсказок адреса (можно подключить API Dadata)
  onStreetInput() {
    if (this.deliveryAddress.street.length > 2) {
      // Имитация подсказок
      this.addressSuggestions = [
        `${this.deliveryAddress.street} улица`,
        `${this.deliveryAddress.street} проспект`,
        `${this.deliveryAddress.street} переулок`,
      ].slice(0, 3);
    } else {
      this.addressSuggestions = [];
    }
  }

  // Очистить все сохраненные данные
  clearAllData() {
    this.locationService.clearAllData();
    this.resetAddressForm();
    this.city$.next(null);
    this.filteredStores = [];
    this.filteredAndSearchedStores = [];
    this.selectedCityId = null;
    this.selectedStoreId = null;
    this.selectedStore$.next(null);
    localStorage.removeItem('saved_addresses');
    this.savedAddresses = [];
  }

  // Получить сохраненный магазин
  getSavedStore(): SelectedStore | null {
    return this.locationService.getCurrentStore();
  }

  // Получить сохраненный адрес
  getSavedAddress(): DeliveryAddress | null {
    return this.locationService.getCurrentAddress();
  }

  filteredDistricts(): DistrictGroup[] {
    return this.locationService.filteredDistricts();
  }

  filteredCities(): City[] {
    return this.locationService.filteredCities();
  }

  onSearchChange() {
    this.locationService.onSearchChange();
  }

  useDetectedCity() {
    const deviceCity = this.detectedCity$.getValue();
    if (deviceCity && deviceCity !== 'Unknown') {
      const allCities = this.locationService.getAvailableCities();
      const matchedCity = allCities.find(city =>
        city.name.toLowerCase().includes(deviceCity.toLowerCase()) ||
        deviceCity.toLowerCase().includes(city.name.toLowerCase())
      );

      if (matchedCity) {
        this.setCity(matchedCity);
      } else {
        // Если город не найден, предлагаем создать или выбрать ближайший
        const tempCity: any = {
          id: 'detected_' + Date.now(),
          name: deviceCity,
          districtId: 'other',
          population: 0
        };
        this.setCity(tempCity);
      }
    }
  }

  isDetectedCityAvailable(): boolean {
    const deviceCity = this.detectedCity$.getValue();
    if (!deviceCity || deviceCity === 'Unknown') return false;

    const allCities = this.locationService.getAvailableCities();
    return allCities.some(city =>
      city.name.toLowerCase().includes(deviceCity.toLowerCase()) ||
      deviceCity.toLowerCase().includes(city.name.toLowerCase())
    );
  }

  getPopularCities(): City[] {
    const allCities = this.locationService.getAvailableCities();

    // Список популярных городов с приоритетом
    const popularCityNames = [
      'Барнаул',
      'Новосибирск',
      'Бийск',
      'Омск',
      'Тюмень',
      'Новокузнецк'
    ];

    const popularCities: City[] = [];

    for (const cityName of popularCityNames) {
      const foundCity = allCities.find(city =>
        city.name.toLowerCase() === cityName.toLowerCase()
      );

      if (foundCity) {
        // Если город найден в списке, добавляем его
        popularCities.push(foundCity);
      }
    }

    return popularCities;
  }

  formatPopulation(population?: number): string {
    if (!population) return '';
    if (population >= 1000000) {
      return (population / 1000000).toFixed(1) + ' млн';
    }
    if (population >= 1000) {
      return (population / 1000).toFixed(0) + ' тыс';
    }
    return population.toString();
  }

  isDistrictSelected(district: any): boolean {
    return this.locationService.selectedDistrict?.id === district.id;
  }

  getDayName(dayOfWeek: number): string {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[dayOfWeek];
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  getTodaySchedule(store: any): { dayName: string, openTime: string, closeTime: string } | null {
    if (!store?.storeSchedule?.workingHours) return null;

    const today = new Date().getDay();
    const todaySchedule = store.storeSchedule.workingHours.find(
      (schedule: any) => schedule.dayOfWeek === today
    );

    if (todaySchedule) {
      return {
        dayName: this.getDayName(todaySchedule.dayOfWeek),
        openTime: this.formatTime(todaySchedule.openTime),
        closeTime: this.formatTime(todaySchedule.closeTime)
      };
    }

    return null;
  }

  isStoreOpenToday(store: any): boolean {
    const todaySchedule = this.getTodaySchedule(store);
    return todaySchedule !== null;
  }

  isStoreOpenNow(store: any): boolean {
    const schedule = this.getTodaySchedule(store);
    if (!schedule) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openHour, openMinute] = schedule.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = schedule.closeTime.split(':').map(Number);

    const openTime = openHour * 60 + openMinute;
    let closeTime = closeHour * 60 + closeMinute;

    // Если магазин работает до следующего дня
    if (closeTime < openTime) {
      closeTime += 24 * 60;
    }

    return currentTime >= openTime && currentTime <= closeTime;
  }

  getOpenStoresCount(): number {
    return this.filteredStores.filter(store => this.isStoreOpenNow(store)).length;
  }

  getWorkingTodayCount(): number {
    return this.filteredStores.filter(store => this.isStoreOpenToday(store)).length;
  }

  // Проверка, выбран ли город
  isCitySelected(city: City): boolean {
    return this.selectedCityId === city.id;
  }

  // Проверка, выбран ли магазин
  isStoreSelected(store: any): boolean {
    return this.selectedStoreId === store.id;
  }

  // Проверка, выбран ли режим "все магазины"
  isShowAllStores(): boolean {
    return this.locationService.isShowAllStores();
  }

  // Фильтрация магазинов по поиску
  filterStores() {
    this.searchSubject.next(this.storeSearchTerm);
  }

  private applyStoreSearch() {
    const term = this.storeSearchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredAndSearchedStores = [...this.filteredStores];
      return;
    }

    this.filteredAndSearchedStores = this.filteredStores.filter(store => {
      const fullName = store.fullName?.toLowerCase() || '';
      const address = store.address ?
        `${store.address.street} ${store.address.house}`.toLowerCase() : '';
      const city = store.address?.city?.toLowerCase() || '';

      return fullName.includes(term) ||
        address.includes(term) ||
        city.includes(term);
    });
  }

  // Обработка нажатия Enter в поиске
  onSearchKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.applyStoreSearch();
    }
  }
}