import { Component, OnInit } from '@angular/core';
import { LocationService, City, DistrictGroup, DeliveryAddress, DeliveryType, Store, SelectedStore } from './location.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
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
  showDeliveryTypeModal$ = new BehaviorSubject<boolean>(false);
  showAddressModal$ = new BehaviorSubject<boolean>(false);
  showNoStoresModal$ = new BehaviorSubject<boolean>(false);
  showStoresListModal$ = new BehaviorSubject<boolean>(false);

  deliveryType$ = new BehaviorSubject<DeliveryType>('pickup');
  savedAddress$ = new BehaviorSubject<DeliveryAddress | null>(null);
  hasStoresInCity$ = new BehaviorSubject<boolean>(true);

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

  // Сохраненные адреса
  savedAddresses: DeliveryAddress[] = [];

  // Подсказки адресов
  addressSuggestions: string[] = [];

  // Состояние сохранения
  isSavingAddress: boolean = false;
  showAddressErrors: boolean = false;

  // Кэш количества магазинов по городам
  private storeCountCache: Map<string, number> = new Map();

  // Магазины в выбранном городе
  storesInSelectedCity: Store[] = [];
  selectedStoreForPickup: Store | null = null;
  selectedStores: Store[] = []; // Для множественного выбора
  isLoadingStores: boolean = false;

  // Единая модалка
  currentModal: 'city' | 'delivery-type' | 'address' | 'stores' | 'no-stores' | null = null;
  showLocationModal$ = new BehaviorSubject<boolean>(false);
  showAddressHistory: boolean = false;

  constructor(
    public locationService: LocationService,
    private userDataService: UserDataService,
    public productPlaceService: ProductPlaceService
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Подписка на магазины для подсчета количества
    this.productPlaceService.productPlaces$.subscribe(stores => {
      this.updateStoreCountCache(stores);
      this.filterStoresBySelectedCity();
    });

    // Подписка на изменения города
    this.locationService.city$.subscribe(city => {
      this.city$.next(city);
      this.selectedCityId = city?.id || null;
      if (city) {
        this.userDataService.setCity(city.name);
        this.filterStoresBySelectedCity();
      }
    });

    // Подписка на модалки с преобразованием в единую модалку
    this.locationService.showCityModal$.subscribe(show => {
      this.showCityModal$.next(show);
      if (show) {
        this.openLocationModal('city');
      } else {
        this.closeLocationModal();
      }
    });

    this.locationService.showDeliveryTypeModal$.subscribe(show => {
      this.showDeliveryTypeModal$.next(show);
      if (show) {
        this.openLocationModal('delivery-type');
      } else {
        this.closeLocationModal();
      }
    });

    this.locationService.showAddressModal$.subscribe(show => {
      this.showAddressModal$.next(show);
      if (show) {
        this.openLocationModal('address');
        this.loadSavedAddresses();
        const savedAddress = this.locationService.getCurrentAddress();
        if (savedAddress) {
          this.deliveryAddress = { ...savedAddress };
        } else {
          this.resetAddressForm();
        }
      } else {
        this.closeLocationModal();
      }
    });

    this.locationService.showNoStoresModal$.subscribe(show => {
      this.showNoStoresModal$.next(show);
      if (show) {
        this.openLocationModal('no-stores');
      } else {
        this.closeLocationModal();
      }
    });

    // Подписка на тип доставки
    this.locationService.deliveryType$.subscribe(type => {
      this.deliveryType$.next(type);
    });

    // Подписка на адрес
    this.locationService.deliveryAddress$.subscribe(address => {
      this.savedAddress$.next(address);
    });

    // Подписка на наличие магазинов
    this.locationService.hasStoresInCity$.subscribe(hasStores => {
      this.hasStoresInCity$.next(hasStores);
    });

    // Подписка на выбранные магазины из сервиса
    this.locationService.selectedStores$.subscribe(selectedStores => {
      // Загружаем полные данные магазинов при изменении выбранных
      if (selectedStores.length > 0 && this.storesInSelectedCity.length > 0) {
        this.selectedStores = this.locationService.getFullSelectedStores(this.storesInSelectedCity);
      }
    });

    // Подписка на режим выбора магазинов
    this.locationService.storeSelectionMode$.subscribe(mode => {
      if (mode === 'specific' && this.locationService.selectedStores$.value.length === 1) {
        const fullStores = this.locationService.getFullSelectedStores(this.storesInSelectedCity);
        this.selectedStoreForPickup = fullStores[0] || null;
      }
    });
  }

  async ngOnInit() {
    this.productPlaceService.getAllProductPlaces(50).subscribe((res: any) => {
      console.log('Stores loaded:', res.data);
    });

    await this.locationService.init();

    const deviceCity = this.userDataService.getCurrentCity();
    this.detectedCity$.next(deviceCity);

    // Проверяем, есть ли сохраненный город
    const savedCity = this.locationService.getCurrentCity();
    if (savedCity) {
      this.city$.next(savedCity);
      this.selectedCityId = savedCity.id || null;
      this.userDataService.setCity(savedCity.name);
      await this.checkStoresInCity(savedCity);
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
      }
    }

    // Загружаем сохраненные адреса
    this.loadSavedAddresses();
  }

  // Методы для управления единой модалкой
  openLocationModal(mode: 'city' | 'delivery-type' | 'address' | 'stores' | 'no-stores') {
    this.currentModal = mode;
    this.showLocationModal$.next(true);
  }

  closeLocationModal() {
    this.showLocationModal$.next(false);
    this.currentModal = null;
    this.showAddressHistory = false;
    this.showAddressErrors = false;
    this.addressSuggestions = [];
  }

  getModalClasses(): string {
    const baseClass = 'modal-container';
    const modalType = this.currentModal ? `modal-${this.currentModal}` : '';
    return `${baseClass} ${modalType}`.trim();
  }

  getModalTitle(): string {
    switch (this.currentModal) {
      case 'city': return 'Выберите ваш город';
      case 'delivery-type': return 'Как получить заказ?';
      case 'address': return 'Адрес доставки';
      case 'stores': return 'Магазины в городе';
      case 'no-stores': return 'Нет магазинов';
      default: return '';
    }
  }

  getModalSubtitle(): string | null {
    switch (this.currentModal) {
      case 'city': return 'Для показа наличия и доставки';
      case 'delivery-type':
        const city = this.city$.getValue();
        return city ? `в городе ${city.name}` : null;
      case 'address':
        const cityAddr = this.city$.getValue();
        return cityAddr ? `в городе ${cityAddr.name}` : null;
      case 'stores':
        const cityStores = this.city$.getValue();
        return cityStores ? `в городе ${cityStores.name}` : null;
      case 'no-stores':
        const cityNoStores = this.city$.getValue();
        return cityNoStores ? `в городе ${cityNoStores.name}` : 'нет магазинов';
      default: return null;
    }
  }

  // Методы для открытия модалок
  openCityListModal() {
    this.openLocationModal('city');
  }

  openDeliveryTypeModal() {
    this.openLocationModal('delivery-type');
  }

  openAddressModal() {
    this.openLocationModal('address');
  }

  openStoresListModal() {
    this.openLocationModal('stores');
    // Загружаем сохраненные выбранные магазины при открытии
    this.loadSelectedStoresFromService();
  }

  closeNoStoresModal() {
    this.closeLocationModal();
  }

  // Вспомогательные методы для магазинов
  getOpenStoresCount(): number {
    return this.storesInSelectedCity.filter(store => this.isStoreOpenNow(store)).length;
  }

  getNearestStore(): string {
    return this.storesInSelectedCity.length > 0 ? '~2 км' : '—';
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

  private filterStoresBySelectedCity() {
    const currentCity = this.city$.getValue();
    if (!currentCity) return;

    firstValueFrom(this.productPlaceService.productPlaces$.pipe(take(1))).then(stores => {
      this.storesInSelectedCity = stores.filter(store =>
        store.address?.city?.toLowerCase().includes(currentCity.name.toLowerCase()) ||
        currentCity.name.toLowerCase().includes(store.address?.city?.toLowerCase() || '')
      );

      // После загрузки магазинов, загружаем выбранные из сервиса
      this.loadSelectedStoresFromService();
    });
  }

  private loadSelectedStoresFromService() {
    if (this.storesInSelectedCity.length > 0) {
      const savedSelectedStores = this.locationService.selectedStores$.value;
      if (savedSelectedStores.length > 0) {
        this.selectedStores = this.locationService.getFullSelectedStores(this.storesInSelectedCity);

        // Если режим specific и есть один магазин
        if (this.locationService.storeSelectionMode$.value === 'specific' && this.selectedStores.length === 1) {
          this.selectedStoreForPickup = this.selectedStores[0];
        }
      }
    }
  }

  private async checkStoresInCity(city: City): Promise<boolean> {
    try {
      const stores = await firstValueFrom(this.productPlaceService.productPlaces$.pipe(take(1)));
      const storesInCity = stores.filter(store =>
        store.address?.city?.toLowerCase().includes(city.name.toLowerCase())
      );
      const hasStores = storesInCity.length > 0;
      this.locationService.hasStoresInCity$.next(hasStores);
      this.storesInSelectedCity = storesInCity;
      return hasStores;
    } catch (error) {
      console.error('Error checking stores in city', error);
      this.locationService.hasStoresInCity$.next(false);
      this.storesInSelectedCity = [];
      return false;
    }
  }

  getStoreCountForCity(city: City): number {
    return this.storeCountCache.get(city.name) || 0;
  }

  setCity(city: City) {
    this.onCitySelected(city);
  }

  async onCitySelected(city: City) {
    this.selectedCityId = city.id || null;
    this.locationService.setCity(city);
    this.userDataService.setCity(city.name);
    this.showCityModal$.next(false);
    this.closeLocationModal();

    const hasStores = await this.checkStoresInCity(city);

    if (!hasStores) {
      setTimeout(() => this.showNoStoresModal$.next(true), 300);
    } else {
      setTimeout(() => this.locationService.openDeliveryTypeModal(), 300);
    }
  }

  setDeliveryType(type: DeliveryType) {
    this.locationService.setDeliveryType(type);
    this.locationService.closeDeliveryTypeModal();

    if (type === 'pickup') {
      if (this.storesInSelectedCity.length > 0) {
        setTimeout(() => this.openStoresListModal(), 300);
      } else {
        setTimeout(() => this.showNoStoresModal$.next(true), 300);
      }
    }
  }

  closeStoresListModal() {
    this.showStoresListModal$.next(false);
    this.closeLocationModal();
  }

  // Переключение режима выбора магазинов
  setStoreSelectionMode(mode: 'all' | 'specific' | 'multiple') {
    if (mode === 'all') {
      this.locationService.setStoreSelectionMode('all');
      this.selectedStoreForPickup = null;
      this.selectedStores = [];
    } else if (mode === 'multiple') {
      // Для множественного выбора передаем текущие выбранные магазины
      this.locationService.setStoreSelectionMode('multiple', this.selectedStores);
    }
  }

  // Переключение режима выбора магазинов - теперь 'all' сохраняет все магазины
  setAllStoresMode() {
    console.log('storesInSelectedCity', this.storesInSelectedCity)
    if (this.storesInSelectedCity) {
      // Сохраняем все магазины города в localStorage
      this.locationService.setStoreSelectionMode('all', this.storesInSelectedCity);
    } else {
      // Если магазинов нет, просто устанавливаем режим 'all'
      this.locationService.setStoreSelectionMode('all');
    }

    this.selectedStoreForPickup = null;
    this.selectedStores = [];

    // Закрываем модалку после выбора "Все магазины"
    this.closeStoresListModal();
  }

  // Выбор магазина (для режима specific) - обновлен
  selectStoreForPickup(store: Store) {
    this.selectedStoreForPickup = store;
    this.selectedStores = [store];
    // Сохраняем в сервис - режим определится как 'specific' автоматически
    this.locationService.setStoreSelectionMode('specific', [store]);
    // Закрываем модалку после выбора магазина
    this.closeStoresListModal();
  }

  // Переключение выбора магазина (теперь всегда множественный выбор)
  toggleStoreSelection(store: Store) {
    const index = this.selectedStores.findIndex(s => s.id === store.id);

    if (index === -1) {
      // Добавляем магазин
      this.selectedStores = [...this.selectedStores, store];
    } else {
      // Удаляем магазин
      this.selectedStores = this.selectedStores.filter(s => s.id !== store.id);
    }

    // Обновляем в сервисе
    if (this.selectedStores.length === 1) {
      // Если остался один магазин - режим 'specific'
      this.locationService.setStoreSelectionMode('specific', this.selectedStores);
      this.selectedStoreForPickup = this.selectedStores[0];
    } else if (this.selectedStores.length > 1) {
      // Если несколько магазинов - режим 'multiple'
      this.locationService.setStoreSelectionMode('multiple', this.selectedStores);
      this.selectedStoreForPickup = null;
    } else {
      // Если ничего не выбрано - режим 'all'
      this.locationService.setStoreSelectionMode('all');
      this.selectedStoreForPickup = null;
    }
  }

  // Сохранение выбранных магазинов (упрощено)
  saveSelectedStores() {
    if (this.selectedStores.length === 1) {
      this.locationService.setStoreSelectionMode('specific', this.selectedStores);
    } else if (this.selectedStores.length > 1) {
      this.locationService.setStoreSelectionMode('multiple', this.selectedStores);
    } else {
      this.locationService.setStoreSelectionMode('all');
    }
    this.closeStoresListModal();
  }

  // Проверка, выбран ли магазин (для режима multiple)
  isStoreSelected(storeId: string): boolean {
    return this.selectedStores.some(s => s.id === storeId);
  }

  // Получение количества выбранных магазинов
  getSelectedStoresCount(): number {
    return this.selectedStores.length;
  }

  // Получение полных данных о выбранных магазинах из сервиса
  getFullSelectedStores(): Store[] {
    return this.locationService.getFullSelectedStores(this.storesInSelectedCity);
  }



  showAvailableProducts() {
    if (this.selectedStoreForPickup || this.selectedStores.length > 0) {
      console.log('Show available products in stores:',
        this.selectedStores.length > 0 ? this.selectedStores : this.selectedStoreForPickup);
    }
  }

  closeNoStoresModalAndOpenCity() {
    this.showNoStoresModal$.next(false);
    this.closeLocationModal();
    setTimeout(() => this.locationService.openCityModal(), 300);
  }

  closeNoStoresModalAndGoToDelivery() {
    this.showNoStoresModal$.next(false);
    this.closeLocationModal();
    this.setDeliveryType('delivery');
  }

  closeAddressModal() {
    this.locationService.closeAddressModal();
    this.showAddressErrors = false;
    this.addressSuggestions = [];
    this.closeLocationModal();
  }

  async saveAddress() {
    this.showAddressErrors = true;

    if (!this.deliveryAddress.street || !this.deliveryAddress.house) {
      return;
    }

    this.isSavingAddress = true;

    setTimeout(() => {
      this.locationService.saveDeliveryAddress(this.deliveryAddress);
      this.saveAddressToHistory(this.deliveryAddress);
      this.isSavingAddress = false;
      this.closeAddressModal();
    }, 500);
  }

  private saveAddressToHistory(address: DeliveryAddress) {
    const saved = localStorage.getItem('saved_addresses');
    let addresses: DeliveryAddress[] = saved ? JSON.parse(saved) : [];

    const exists = addresses.some(a =>
      a.street === address.street && a.house === address.house
    );

    if (!exists) {
      addresses.unshift(address);
      if (addresses.length > 5) {
        addresses = addresses.slice(0, 5);
      }
      localStorage.setItem('saved_addresses', JSON.stringify(addresses));
      this.savedAddresses = addresses;
    }
  }

  loadSavedAddresses() {
    const saved = localStorage.getItem('saved_addresses');
    this.savedAddresses = saved ? JSON.parse(saved) : [];
  }

  loadSavedAddress(address: DeliveryAddress) {
    this.deliveryAddress = { ...address };
    this.addressSuggestions = [];
  }

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

  selectAddressSuggestion(suggestion: string) {
    this.deliveryAddress.street = suggestion;
    this.addressSuggestions = [];

    setTimeout(() => {
      const houseInput = document.getElementById('house');
      if (houseInput) {
        houseInput.focus();
      }
    }, 100);
  }

  onStreetInput() {
    if (this.deliveryAddress.street.length > 2) {
      this.addressSuggestions = [
        `${this.deliveryAddress.street} улица`,
        `${this.deliveryAddress.street} проспект`,
        `${this.deliveryAddress.street} переулок`,
      ].slice(0, 3);
    } else {
      this.addressSuggestions = [];
    }
  }

  clearAllData() {
    this.locationService.clearAllData();
    this.resetAddressForm();
    this.city$.next(null);
    this.selectedCityId = null;
    localStorage.removeItem('saved_addresses');
    this.savedAddresses = [];
    this.storesInSelectedCity = [];
    this.selectedStoreForPickup = null;
    this.selectedStores = [];
  }

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
        this.onCitySelected(matchedCity);
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

  isDistrictSelected(district: DistrictGroup): boolean {
    return this.locationService.selectedDistrict?.name === district.name;
  }

  isCitySelected(city: City): boolean {
    return this.selectedCityId === city.id;
  }

  isDeliveryType(type: DeliveryType): boolean {
    return this.deliveryType$.value === type;
  }

  formatWorkingHours(store: Store): string {
    if (!store.storeSchedule || !store.storeSchedule.workingHours) {
      return 'График не указан';
    }

    const today = new Date().getDay();
    const dayOfWeek = today === 0 ? 7 : today;

    const todaySchedule = store.storeSchedule.workingHours.find(
      (wh: any) => wh.dayOfWeek === dayOfWeek
    );

    if (todaySchedule) {
      const openTime = todaySchedule.openTime.substring(0, 5);
      const closeTime = todaySchedule.closeTime.substring(0, 5);
      return `Сегодня: ${openTime}–${closeTime}`;
    }

    return 'График не указан';
  }

  isStoreOpenNow(store: Store): boolean {
    if (!store.storeSchedule || !store.storeSchedule.workingHours) {
      return false;
    }

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const todaySchedule = store.storeSchedule.workingHours.find(
      (wh: any) => wh.dayOfWeek === currentDay
    );

    if (!todaySchedule) return false;

    const [openHour, openMin] = todaySchedule.openTime.split(':').map(Number);
    const [closeHour, closeMin] = todaySchedule.closeTime.split(':').map(Number);

    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    return currentTime >= openMinutes && currentTime <= closeMinutes;
  }
}