import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { StorageUtils } from '../../../../utils/storage.utils';

export interface City {
  coords: { lat: string; lon: string };
  district: string;
  name: string;
  population: number;
  subject: string;
  id?: string;
}

export interface DistrictGroup {
  name: string;
  cities: City[];
  showAll: boolean;
}

export interface DeliveryAddress {
  street: string;
  house: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  comment?: string;
}

export interface Store {
  id: string;
  fullName: string;
  address: {
    street: string;
    house: string;
    city: string;
  };
  storeSchedule?: {
    workingHours: Array<{
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
    }>;
  };
}

export interface SelectedStore {
  id: string;
  fullName: string;
}

export type DeliveryType = 'pickup' | 'delivery';
export type StoreSelectionMode = 'all' | 'specific' | 'multiple';

@Injectable({ providedIn: 'root' })
export class LocationService {
  // Ключи для localStorage
  private readonly STORAGE_KEYS = {
    CITY: 'pktn_userCity',
    ADDRESS: 'pktn_deliveryAddress',
    DELIVERY_TYPE: 'pktn_delivery_type',
    STORE_SELECTION_MODE: 'pktn_store_selection_mode',
    SELECTED_STORES: 'pktn_selected_stores',
    LAST_DISTRICT: 'pktn_lastDistrict'
  } as const;

  // BehaviorSubject для состояния
  city$ = new BehaviorSubject<City | null>(null);
  detectedCity$ = new BehaviorSubject<string | null>(null);

  // Добавляем currentSession$ для header
  currentSession$ = new BehaviorSubject<string | null>(null);

  // Модалки
  showCityModal$ = new BehaviorSubject<boolean>(false);
  showAddressModal$ = new BehaviorSubject<boolean>(false);
  showDeliveryTypeModal$ = new BehaviorSubject<boolean>(false);
  showStoreSelectionModal$ = new BehaviorSubject<boolean>(false);
  showNoStoresModal$ = new BehaviorSubject<boolean>(false);

  // Тип доставки
  deliveryType$ = new BehaviorSubject<DeliveryType>('pickup');

  // Режим выбора магазина
  storeSelectionMode$ = new BehaviorSubject<StoreSelectionMode>('all');

  // Массив выбранных магазинов
  selectedStores$ = new BehaviorSubject<SelectedStore[]>([]);

  // Адрес доставки
  deliveryAddress$ = new BehaviorSubject<DeliveryAddress | null>(null);

  // Флаг наличия магазинов в выбранном городе
  hasStoresInCity$ = new BehaviorSubject<boolean>(true);

  // Список магазинов в выбранном городе
  storesInCity$ = new BehaviorSubject<Store[]>([]);

  // Данные для UI
  cities: City[] = [];
  groupedDistricts: DistrictGroup[] = [];
  selectedDistrict: DistrictGroup | null = null;
  citySearch: string = '';

  constructor(private http: HttpClient) {
    this.loadSavedData();
  }

  async init() {
    if (!this.cities.length) {
      const data = await firstValueFrom(
        this.http.get<City[]>('/russian-cities.json'),
      );
      this.cities = data.map((city, index) => ({
        ...city,
        id: `city_${index}`
      }));
      this.groupCities();
      this.detectUserCity();
    }
  }

  private loadSavedData() {
    try {
      // Загружаем город
      const savedCity = localStorage.getItem(this.STORAGE_KEYS.CITY);
      if (savedCity) {
        setTimeout(() => {
          const city = this.cities.find(c => c.name === savedCity);
          if (city) {
            this.city$.next(city);
          }
        }, 100);
      }

      // Загружаем тип доставки
      const savedType = localStorage.getItem(this.STORAGE_KEYS.DELIVERY_TYPE) as DeliveryType;
      if (savedType && ['pickup', 'delivery'].includes(savedType)) {
        this.deliveryType$.next(savedType);
      }

      // Загружаем режим выбора магазина
      const savedMode = localStorage.getItem(this.STORAGE_KEYS.STORE_SELECTION_MODE) as StoreSelectionMode;
      if (savedMode && ['all', 'specific', 'multiple'].includes(savedMode)) {
        this.storeSelectionMode$.next(savedMode);
      }

      // Загружаем массив выбранных магазинов
      const savedStores = localStorage.getItem(this.STORAGE_KEYS.SELECTED_STORES);
      if (savedStores) {
        const stores = JSON.parse(savedStores);
        if (Array.isArray(stores)) {
          this.selectedStores$.next(stores);
        }
      }

      // Загружаем адрес
      const savedAddress = localStorage.getItem(this.STORAGE_KEYS.ADDRESS);
      if (savedAddress) {
        const address = JSON.parse(savedAddress);
        this.deliveryAddress$.next(address);
      }

      // Проверяем сессию
      this.currentSession$.next(StorageUtils.getSessionStorage(this.STORAGE_KEYS.CITY));
    } catch (e) {
      console.error('Error loading saved data', e);
    }
  }

  // Сохранение адреса доставки
  saveDeliveryAddress(address: DeliveryAddress) {
    this.deliveryAddress$.next(address);
    localStorage.setItem(this.STORAGE_KEYS.ADDRESS, JSON.stringify(address));
    this.showAddressModal$.next(false);
  }

  // Установка типа доставки
  setDeliveryType(type: DeliveryType) {
    this.deliveryType$.next(type);
    localStorage.setItem(this.STORAGE_KEYS.DELIVERY_TYPE, type);
    this.showDeliveryTypeModal$.next(false);

    if (type === 'pickup') {
      setTimeout(() => this.openStoreSelectionModal(), 300);
    } else {
      setTimeout(() => this.openAddressModal(), 300);
    }
  }

  // Установка режима выбора магазина
  setStoreSelectionMode(mode: StoreSelectionMode, stores?: Store[]) {
    this.storeSelectionMode$.next(mode);
    localStorage.setItem(this.STORAGE_KEYS.STORE_SELECTION_MODE, mode);

    if (mode === 'all' && stores?.length == 0) {
      this.selectedStores$.next([]);
      localStorage.removeItem(this.STORAGE_KEYS.SELECTED_STORES);
    } else if (stores && stores.length > 0) {
      const selectedStores: SelectedStore[] = stores.map(store => ({
        id: store.id,
        fullName: store.fullName
      }));
      const selectedLocalStores: string[] = stores.map(store => (store.fullName));
      this.selectedStores$.next(selectedStores);
      localStorage.setItem(this.STORAGE_KEYS.SELECTED_STORES, JSON.stringify(selectedLocalStores));
    }

    this.showStoreSelectionModal$.next(false);
  }

  // Добавление магазина к выбранным
  addStoreToSelection(store: Store) {
    const currentStores = this.selectedStores$.getValue();
    const storeExists = currentStores.some(s => s.id === store.id);

    if (!storeExists) {
      const newStore: SelectedStore = {
        id: store.id,
        fullName: store.fullName
      };
      const updatedStores = [...currentStores, newStore];
      this.selectedStores$.next(updatedStores);
      localStorage.setItem(this.STORAGE_KEYS.SELECTED_STORES, JSON.stringify(updatedStores));
    }
  }

  // Удаление магазина из выбранных
  removeStoreFromSelection(storeId: string) {
    const updatedStores = this.selectedStores$.getValue().filter(s => s.id !== storeId);
    this.selectedStores$.next(updatedStores);

    if (updatedStores.length > 0) {
      localStorage.setItem(this.STORAGE_KEYS.SELECTED_STORES, JSON.stringify(updatedStores));
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.SELECTED_STORES);
      this.storeSelectionMode$.next('all');
      localStorage.setItem(this.STORAGE_KEYS.STORE_SELECTION_MODE, 'all');
    }
  }

  // Очистка выбора магазинов
  clearStoreSelection() {
    this.selectedStores$.next([]);
    this.storeSelectionMode$.next('all');
    localStorage.removeItem(this.STORAGE_KEYS.SELECTED_STORES);
    localStorage.setItem(this.STORAGE_KEYS.STORE_SELECTION_MODE, 'all');
  }

  // Получение полных данных о выбранных магазинах
  getFullSelectedStores(allStores: Store[]): Store[] {
    const selectedIds = this.selectedStores$.getValue().map(s => s.id);
    return allStores.filter(store => selectedIds.includes(store.id));
  }

  // Проверка, выбран ли конкретный магазин
  isStoreSelected(storeId: string): boolean {
    return this.selectedStores$.getValue().some(s => s.id === storeId);
  }

  // Установка списка магазинов в городе
  setStoresInCity(stores: Store[]) {
    this.storesInCity$.next(stores);
    this.hasStoresInCity$.next(stores.length > 0);
  }

  // Очистка адреса доставки
  clearDeliveryAddress() {
    this.deliveryAddress$.next(null);
    localStorage.removeItem(this.STORAGE_KEYS.ADDRESS);
  }

  // Полная очистка всех данных
  clearAllData() {
    this.city$.next(null);
    this.deliveryAddress$.next(null);
    this.deliveryType$.next('pickup');
    this.storeSelectionMode$.next('all');
    this.selectedStores$.next([]);
    this.hasStoresInCity$.next(true);
    this.storesInCity$.next([]);
    this.selectedDistrict = null;
    this.citySearch = '';
    this.currentSession$.next(null);

    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Открыть модалку выбора города
  openCityModal() {
    const savedDistrict = localStorage.getItem(this.STORAGE_KEYS.LAST_DISTRICT);
    if (savedDistrict && this.city$.value) {
      const district = this.groupedDistricts.find(d => d.name === savedDistrict);
      this.selectedDistrict = district || null;
    } else {
      this.selectedDistrict = null;
    }
    this.citySearch = '';
    this.showCityModal$.next(true);
  }

  // Методы для открытия/закрытия модалок
  openDeliveryTypeModal() {
    this.showDeliveryTypeModal$.next(true);
  }

  closeDeliveryTypeModal() {
    this.showDeliveryTypeModal$.next(false);
  }

  openStoreSelectionModal() {
    this.showStoreSelectionModal$.next(true);
  }

  closeStoreSelectionModal() {
    this.showStoreSelectionModal$.next(false);
  }

  openAddressModal() {
    this.showAddressModal$.next(true);
  }

  closeAddressModal() {
    this.showAddressModal$.next(false);
  }

  openNoStoresModal() {
    this.showNoStoresModal$.next(true);
  }

  closeNoStoresModal() {
    this.showNoStoresModal$.next(false);
  }

  // Установка города
  setCity(city: City) {
    this.city$.next(city);
    localStorage.setItem(this.STORAGE_KEYS.CITY, city.name);

    const district = this.groupedDistricts.find(d =>
      d.cities.some(c => c.name === city.name)
    );
    if (district) {
      localStorage.setItem(this.STORAGE_KEYS.LAST_DISTRICT, district.name);
    }

    this.selectedDistrict = null;
    this.showCityModal$.next(false);
    StorageUtils.setSessionStorage(this.STORAGE_KEYS.CITY, 'true');
    this.currentSession$.next('true');
  }

  // Подтверждение города (метод для header)
  confirmCity() {
    const detectedCityName = this.detectedCity$.value;
    if (detectedCityName) {
      const foundCity = this.cities.find(city =>
        city.name === detectedCityName
      );
      if (foundCity) {
        this.setCity(foundCity);
      } else {
        this.openCityModal();
      }
    }
    StorageUtils.setSessionStorage(this.STORAGE_KEYS.CITY, 'true');
    this.currentSession$.next('true');
  }

  // Получение доступных городов
  getAvailableCities(): City[] {
    return this.cities;
  }

  // Получение текущего города
  getCurrentCity(): City | null {
    return this.city$.value;
  }

  // Получение текущего адреса
  getCurrentAddress(): DeliveryAddress | null {
    return this.deliveryAddress$.value;
  }

  // Получение текущего типа доставки
  getCurrentDeliveryType(): DeliveryType {
    return this.deliveryType$.value;
  }

  // Получение текущего режима выбора магазинов
  getCurrentStoreSelectionMode(): StoreSelectionMode {
    return this.storeSelectionMode$.value;
  }

  // Получение выбранных магазинов
  getCurrentSelectedStores(): SelectedStore[] {
    return this.selectedStores$.value;
  }

  // Проверка наличия сохраненных данных
  hasSavedData(): boolean {
    return !!this.city$.value;
  }

  // Группировка городов по субъектам
  private groupCities() {
    const grouped = this.cities.reduce(
      (acc, city) => {
        if (!acc[city.subject]) acc[city.subject] = [];
        acc[city.subject].push(city);
        return acc;
      },
      {} as Record<string, City[]>,
    );

    this.groupedDistricts = Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map((subject) => ({
        name: subject,
        cities: grouped[subject].sort((a, b) => a.name.localeCompare(b.name)),
        showAll: false,
      }));
  }

  // Фильтрация областей по поиску
  filteredDistricts(): DistrictGroup[] {
    if (!this.citySearch) return this.groupedDistricts;

    const search = this.citySearch.toLowerCase();
    return this.groupedDistricts.filter(
      (d) =>
        d.name.toLowerCase().includes(search) ||
        d.cities.some((c) => c.name.toLowerCase().includes(search)),
    );
  }

  // Фильтрация городов по поиску
  filteredCities(): City[] {
    if (!this.selectedDistrict) return [];
    if (!this.citySearch) return this.selectedDistrict.cities;

    const search = this.citySearch.toLowerCase();
    return this.selectedDistrict.cities.filter((c) =>
      c.name.toLowerCase().startsWith(search),
    );
  }

  // Обработка изменения поиска
  onSearchChange() {
    if (!this.citySearch) {
      this.selectedDistrict = null;
    }
  }

  // Определение города пользователя
  private detectUserCity() {
    const userCityName = localStorage.getItem(this.STORAGE_KEYS.CITY);
    if (userCityName) {
      const foundCity = this.cities.find(city => city.name === userCityName);
      if (foundCity) {
        this.city$.next(foundCity);
        this.detectedCity$.next(userCityName);
      }
      this.currentSession$.next(
        StorageUtils.getSessionStorage(this.STORAGE_KEYS.CITY),
      );
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => this.getCityFromCoords(pos.coords.latitude, pos.coords.longitude),
        () => console.warn('Не удалось получить геолокацию'),
      );
    }
  }

  // Установка города по названию
  setCityByName(cityName: string): boolean {
    const foundCity = this.cities.find(city => city.name === cityName);
    if (foundCity) {
      this.setCity(foundCity);
      return true;
    }
    return false;
  }

  // Получение города по координатам
  private async getCityFromCoords(lat: number, lon: number) {
    try {
      const res = await fetch(
        'https://песочница.пакетон.рф/api/auth/authentication',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'Admin1', password: 'QweQwe', lat, lon }),
        },
      );

      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

      const data = await res.json();
      const cityName = data.address?.city || data.address?.town || data.address?.village;

      if (cityName) {
        this.detectedCity$.next(cityName);

        const foundCity = this.cities.find(city =>
          city.name.toLowerCase().includes(cityName.toLowerCase()) ||
          cityName.toLowerCase().includes(city.name.toLowerCase())
        );

        if (foundCity) {
          this.city$.next(foundCity);
          localStorage.setItem(this.STORAGE_KEYS.CITY, foundCity.name);
        } else {
          this.showCityModal$.next(true);
        }
      }
    } catch (err) {
      console.error('Error detecting city:', err);
      this.showCityModal$.next(true);
    }
  }
}