import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { StorageUtils } from '../../../../utils/storage.utils';
import { environment } from '../../../../environment';

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
  // 🔒 Инжектим платформу для проверки SSR
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

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
  currentSession$ = new BehaviorSubject<string | null>(null);

  // Модалки
  showCityModal$ = new BehaviorSubject<boolean>(false);
  showAddressModal$ = new BehaviorSubject<boolean>(false);
  showDeliveryTypeModal$ = new BehaviorSubject<boolean>(false);
  showStoreSelectionModal$ = new BehaviorSubject<boolean>(false);
  showNoStoresModal$ = new BehaviorSubject<boolean>(false);

  deliveryType$ = new BehaviorSubject<DeliveryType>('pickup');
  storeSelectionMode$ = new BehaviorSubject<StoreSelectionMode>('all');
  selectedStores$ = new BehaviorSubject<SelectedStore[]>([]);
  deliveryAddress$ = new BehaviorSubject<DeliveryAddress | null>(null);
  hasStoresInCity$ = new BehaviorSubject<boolean>(true);
  storesInCity$ = new BehaviorSubject<Store[]>([]);

  cities: City[] = [];
  groupedDistricts: DistrictGroup[] = [];
  selectedDistrict: DistrictGroup | null = null;
  citySearch: string = '';

  constructor(private http: HttpClient) {
    // 🔒 Загружаем данные только в браузере
    if (this.isBrowser) {
      this.loadSavedData();
    }
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
      
      // 🔒 detectUserCity только в браузере
      if (this.isBrowser) {
        this.detectUserCity();
      }
    }
  }

  private loadSavedData() {
    if (!this.isBrowser) return; // 🔒 Защита SSR

    try {
      const savedCity = localStorage.getItem(this.STORAGE_KEYS.CITY);
      if (savedCity) {
        setTimeout(() => {
          const city = this.cities.find(c => c.name === savedCity);
          if (city) {
            this.city$.next(city);
          }
        }, 100);
      }

      const savedType = localStorage.getItem(this.STORAGE_KEYS.DELIVERY_TYPE) as DeliveryType;
      if (savedType && ['pickup', 'delivery'].includes(savedType)) {
        this.deliveryType$.next(savedType);
      }

      const savedMode = localStorage.getItem(this.STORAGE_KEYS.STORE_SELECTION_MODE) as StoreSelectionMode;
      if (savedMode && ['all', 'specific', 'multiple'].includes(savedMode)) {
        this.storeSelectionMode$.next(savedMode);
      }

      const savedStores = localStorage.getItem(this.STORAGE_KEYS.SELECTED_STORES);
      if (savedStores) {
        const stores = JSON.parse(savedStores);
        if (Array.isArray(stores)) {
          this.selectedStores$.next(stores);
        }
      }

      const savedAddress = localStorage.getItem(this.STORAGE_KEYS.ADDRESS);
      if (savedAddress) {
        const address = JSON.parse(savedAddress);
        this.deliveryAddress$.next(address);
      }

      this.currentSession$.next(StorageUtils.getSessionStorage(this.STORAGE_KEYS.CITY));
    } catch (e) {
    }
  }

  saveDeliveryAddress(address: DeliveryAddress) {
    this.deliveryAddress$.next(address);
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEYS.ADDRESS, JSON.stringify(address));
    }
    this.showAddressModal$.next(false);
  }

  setDeliveryType(type: DeliveryType) {
    this.deliveryType$.next(type);
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEYS.DELIVERY_TYPE, type);
    }
    this.showDeliveryTypeModal$.next(false);

    if (type === 'pickup') {
      setTimeout(() => this.openStoreSelectionModal(), 300);
    } else {
      setTimeout(() => this.openAddressModal(), 300);
    }
  }

  setStoreSelectionMode(mode: StoreSelectionMode, stores?: Store[]) {
    this.storeSelectionMode$.next(mode);
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEYS.STORE_SELECTION_MODE, mode);
    }

    if (mode === 'all' && stores?.length == 0) {
      this.selectedStores$.next([]);
      if (this.isBrowser) {
        localStorage.removeItem(this.STORAGE_KEYS.SELECTED_STORES);
      }
    } else if (stores && stores.length > 0) {
      const selectedStores: SelectedStore[] = stores.map(store => ({
        id: store.id,
        fullName: store.fullName
      }));
      const selectedLocalStores: string[] = stores.map(store => store.fullName);
      this.selectedStores$.next(selectedStores);
      if (this.isBrowser) {
        localStorage.setItem(this.STORAGE_KEYS.SELECTED_STORES, JSON.stringify(selectedLocalStores));
      }
    }

    this.showStoreSelectionModal$.next(false);
  }

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
      if (this.isBrowser) {
        localStorage.setItem(this.STORAGE_KEYS.SELECTED_STORES, JSON.stringify(updatedStores));
      }
    }
  }

  removeStoreFromSelection(storeId: string) {
    const updatedStores = this.selectedStores$.getValue().filter(s => s.id !== storeId);
    this.selectedStores$.next(updatedStores);

    if (!this.isBrowser) return;

    if (updatedStores.length > 0) {
      localStorage.setItem(this.STORAGE_KEYS.SELECTED_STORES, JSON.stringify(updatedStores));
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.SELECTED_STORES);
      this.storeSelectionMode$.next('all');
      localStorage.setItem(this.STORAGE_KEYS.STORE_SELECTION_MODE, 'all');
    }
  }

  clearStoreSelection() {
    this.selectedStores$.next([]);
    this.storeSelectionMode$.next('all');
    if (this.isBrowser) {
      localStorage.removeItem(this.STORAGE_KEYS.SELECTED_STORES);
      localStorage.setItem(this.STORAGE_KEYS.STORE_SELECTION_MODE, 'all');
    }
  }

  getFullSelectedStores(allStores: Store[]): Store[] {
    const selectedIds = this.selectedStores$.getValue().map(s => s.id);
    return allStores.filter(store => selectedIds.includes(store.id));
  }

  isStoreSelected(storeId: string): boolean {
    return this.selectedStores$.getValue().some(s => s.id === storeId);
  }

  setStoresInCity(stores: Store[]) {
    this.storesInCity$.next(stores);
    this.hasStoresInCity$.next(stores.length > 0);
  }

  clearDeliveryAddress() {
    this.deliveryAddress$.next(null);
    if (this.isBrowser) {
      localStorage.removeItem(this.STORAGE_KEYS.ADDRESS);
    }
  }

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

    if (this.isBrowser) {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }

  openCityModal() {
    if (!this.isBrowser) return;

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

  setCity(city: City) {
    this.city$.next(city);
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEYS.CITY, city.name);
    }

    const district = this.groupedDistricts.find(d =>
      d.cities.some(c => c.name === city.name)
    );
    if (district && this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEYS.LAST_DISTRICT, district.name);
    }

    this.selectedDistrict = null;
    this.showCityModal$.next(false);
    StorageUtils.setSessionStorage(this.STORAGE_KEYS.CITY, 'true');
    this.currentSession$.next('true');
  }

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

  getAvailableCities(): City[] {
    return this.cities;
  }

  getCurrentCity(): City | null {
    return this.city$.value;
  }

  getCurrentAddress(): DeliveryAddress | null {
    return this.deliveryAddress$.value;
  }

  getCurrentDeliveryType(): DeliveryType {
    return this.deliveryType$.value;
  }

  getCurrentStoreSelectionMode(): StoreSelectionMode {
    return this.storeSelectionMode$.value;
  }

  getCurrentSelectedStores(): SelectedStore[] {
    return this.selectedStores$.value;
  }

  hasSavedData(): boolean {
    return !!this.city$.value;
  }

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

  filteredDistricts(): DistrictGroup[] {
    if (!this.citySearch) return this.groupedDistricts;

    const search = this.citySearch.toLowerCase();
    return this.groupedDistricts.filter(
      (d) =>
        d.name.toLowerCase().includes(search) ||
        d.cities.some((c) => c.name.toLowerCase().includes(search)),
    );
  }

  filteredCities(): City[] {
    if (!this.selectedDistrict) return [];
    if (!this.citySearch) return this.selectedDistrict.cities;

    const search = this.citySearch.toLowerCase();
    return this.selectedDistrict.cities.filter((c) =>
      c.name.toLowerCase().startsWith(search),
    );
  }

  onSearchChange() {
    if (!this.citySearch) {
      this.selectedDistrict = null;
    }
  }

  private detectUserCity() {
    if (!this.isBrowser) return; // 🔒 Защита SSR

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
        () => { },
      );
    }
  }

  setCityByName(cityName: string): boolean {
    const foundCity = this.cities.find(city => city.name === cityName);
    if (foundCity) {
      this.setCity(foundCity);
      return true;
    }
    return false;
  }

  saveUserCity(city: string): Observable<any> {
    return this.http.post(
      `${environment.production}/auth/UpdateUserCity`,
      { city: city }
    );
  }
}