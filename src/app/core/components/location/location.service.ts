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
  comment?: string;
}

export interface SelectedStore {
  id: string;
  fullName: string;
  address: string;
}

export interface StoreSelectionState {
  type: 'single' | 'all'; // 'single' - выбран конкретный магазин, 'all' - показать все магазины
  storeId?: string; // ID магазина, если type = 'single'
  storeData?: SelectedStore; // Данные магазина, если type = 'single'
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  localStorage_city = 'pktn_userCity';
  localStorage_address = 'pktn_deliveryAddress';
  localStorage_store = 'pktn_selectedStore';
  localStorage_store_state = 'pktn_store_state'; // Новый ключ для состояния выбора магазина
  localStorage_lastDistrict = 'pktn_lastDistrict';
  
  city$ = new BehaviorSubject<City | null>(null);
  detectedCity$ = new BehaviorSubject<string | null>(null);
  showCityModal$ = new BehaviorSubject<boolean>(false);
  showStoreModal$ = new BehaviorSubject<boolean>(false);
  showAddressModal$ = new BehaviorSubject<boolean>(false);
  currentSession$ = new BehaviorSubject<string | null>(null);
  
  // Данные для адреса доставки
  deliveryAddress$ = new BehaviorSubject<DeliveryAddress | null>(null);
  
  // Данные для выбранного магазина
  selectedStore$ = new BehaviorSubject<SelectedStore | null>(null);
  
  // Состояние выбора магазина
  storeSelectionState$ = new BehaviorSubject<StoreSelectionState>({ type: 'all' });
  
  cities: City[] = [];
  groupedDistricts: DistrictGroup[] = [];
  selectedDistrict: any | null = null;
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
    // Загружаем город
    const savedCity = localStorage.getItem(this.localStorage_city);
    if (savedCity) {
      setTimeout(() => {
        const city = this.cities.find(c => c.name === savedCity);
        if (city) {
          this.city$.next(city);
        }
      }, 100);
    }

    // Загружаем адрес
    const savedAddress = localStorage.getItem(this.localStorage_address);
    if (savedAddress) {
      try {
        this.deliveryAddress$.next(JSON.parse(savedAddress));
      } catch (e) {
        console.error('Error parsing saved address', e);
      }
    }

    // Загружаем состояние выбора магазина
    const savedStoreState = localStorage.getItem(this.localStorage_store_state);
    if (savedStoreState) {
      try {
        const state = JSON.parse(savedStoreState);
        this.storeSelectionState$.next(state);
      } catch (e) {
        console.error('Error parsing store state', e);
      }
    }

    // Загружаем магазин
    const savedStore = localStorage.getItem(this.localStorage_store);
    if (savedStore) {
      try {
        this.selectedStore$.next(JSON.parse(savedStore));
      } catch (e) {
        console.error('Error parsing saved store', e);
      }
    }
  }

  saveDeliveryAddress(address: DeliveryAddress) {
    this.deliveryAddress$.next(address);
    localStorage.setItem(this.localStorage_address, JSON.stringify(address));
    this.showAddressModal$.next(false);
  }

  saveSelectedStore(store: any) {
    const selectedStore: SelectedStore = {
      id: store.id,
      fullName: store.fullName,
      address: store.address ? `${store.address.street}, ${store.address.house}` : ''
    };
    this.selectedStore$.next(selectedStore);
    localStorage.setItem(this.localStorage_store, JSON.stringify(selectedStore));
    
    // Устанавливаем состояние как выбранный конкретный магазин
    const state: StoreSelectionState = {
      type: 'single',
      storeId: store.id,
      storeData: selectedStore
    };
    this.storeSelectionState$.next(state);
    localStorage.setItem(this.localStorage_store_state, JSON.stringify(state));
  }

  // Установить состояние "показать во всех магазинах"
  setShowAllStores() {
    const state: StoreSelectionState = { type: 'all' };
    this.storeSelectionState$.next(state);
    localStorage.setItem(this.localStorage_store_state, JSON.stringify(state));
    this.selectedStore$.next(null);
    localStorage.removeItem(this.localStorage_store);
  }

  // Получить текущее состояние выбора магазина
  getStoreSelectionState(): StoreSelectionState {
    return this.storeSelectionState$.value;
  }

  // Проверка, выбран ли конкретный магазин
  isStoreSelected(storeId: string): boolean {
    const state = this.storeSelectionState$.value;
    return state.type === 'single' && state.storeId === storeId;
  }

  // Проверка, выбран ли режим "все магазины"
  isShowAllStores(): boolean {
    return this.storeSelectionState$.value.type === 'all';
  }

  clearSelectedStore() {
    this.selectedStore$.next(null);
    localStorage.removeItem(this.localStorage_store);
    this.setShowAllStores(); // По умолчанию переключаем на "все магазины"
  }

  clearDeliveryAddress() {
    this.deliveryAddress$.next(null);
    localStorage.removeItem(this.localStorage_address);
  }

  clearAllData() {
    this.city$.next(null);
    this.deliveryAddress$.next(null);
    this.selectedStore$.next(null);
    this.selectedDistrict = null;
    this.citySearch = '';
    this.storeSelectionState$.next({ type: 'all' });
    localStorage.removeItem(this.localStorage_city);
    localStorage.removeItem(this.localStorage_address);
    localStorage.removeItem(this.localStorage_store);
    localStorage.removeItem(this.localStorage_store_state);
    localStorage.removeItem(this.localStorage_lastDistrict);
  }

  openAddressModal() {
    this.showAddressModal$.next(true);
  }

  closeAddressModal() {
    this.showAddressModal$.next(false);
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

  getCurrentStore(): SelectedStore | null {
    return this.selectedStore$.value;
  }

  hasSavedData(): boolean {
    return !!(this.city$.value || this.deliveryAddress$.value || this.selectedStore$.value);
  }

  groupCities() {
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

  openCityListModal() {
    const savedDistrict = localStorage.getItem(this.localStorage_lastDistrict);
    if (savedDistrict && this.city$.value) {
      const district = this.groupedDistricts.find(d => d.name === savedDistrict);
      if (district) {
        this.selectedDistrict = district;
      } else {
        this.selectedDistrict = null;
      }
    } else {
      this.selectedDistrict = null;
    }
    this.citySearch = '';
    this.showCityModal$.next(true);
  }

  openStoreModal() {
    this.showStoreModal$.next(true);
  }

  closeStoreModal() {
    this.showStoreModal$.next(false);
  }

  setCity(city: City) {
    this.city$.next(city);
    localStorage.setItem(this.localStorage_city, city.name);
    
    const district = this.groupedDistricts.find(d => 
      d.cities.some(c => c.name === city.name)
    );
    if (district) {
      localStorage.setItem(this.localStorage_lastDistrict, district.name);
    }
    
    this.selectedDistrict = null;
    this.showCityModal$.next(false);
    StorageUtils.setSessionStorage(this.localStorage_city, 'true');
    
    setTimeout(() => this.openStoreModal(), 300);
  }

  confirmCity() {
    const detectedCityName = this.detectedCity$.value;
    if (detectedCityName) {
      const foundCity = this.cities.find(city => 
        city.name === detectedCityName
      );
      if (foundCity) {
        this.city$.next(foundCity);
      }
    }
    this.showCityModal$.next(false);
    StorageUtils.setSessionStorage(this.localStorage_city, 'true');
    
    setTimeout(() => this.openStoreModal(), 300);
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
    return this.selectedDistrict.cities.filter((c: any) =>
      c.name.toLowerCase().startsWith(search),
    );
  }

  onSearchChange() {
    if (!this.citySearch) {
      this.selectedDistrict = null;
    }
  }

  detectUserCity() {
    const userCityName = localStorage.getItem(this.localStorage_city);
    if (userCityName) {
      const foundCity = this.cities.find(city => city.name === userCityName);
      if (foundCity) {
        this.city$.next(foundCity);
        this.detectedCity$.next(userCityName);
      }
      this.currentSession$.next(
        StorageUtils.getSessionStorage(this.localStorage_city),
      );
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          this.getCityFromCoords(pos.coords.latitude, pos.coords.longitude),
        () => console.warn('Не удалось получить геолокацию'),
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

  private async getCityFromCoords(lat: number, lon: number) {
    try {
      const res = await fetch(
        'https://песочница.пакетон.рф/api/auth/authentication',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'Admin1',
            password: 'QweQwe',
            lat,
            lon,
          }),
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

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
          localStorage.setItem(this.localStorage_city, foundCity.name);
        } else {
          this.showCityModal$.next(true);
        }
      }
    } catch (err) {
      console.error(err);
      this.showCityModal$.next(true);
    }
  }
}