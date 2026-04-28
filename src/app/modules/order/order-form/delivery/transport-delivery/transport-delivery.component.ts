import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AddressesService } from '../../../../../core/api/addresses.service';
import { finalize } from 'rxjs';
import { Address } from '../../../../../../models/address.interface';

declare global {
  interface Window {
    ymaps: any;
  }
}

interface MapPoint {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  work_time?: string;
  postal_code?: string;
  code?: string;
  type: 'cdek' | 'dellin' | 'baikal';
}

@Component({
  selector: 'app-transport-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transport-delivery.component.html',
  styleUrls: ['./transport-delivery.component.scss']
})
export class TransportDeliveryComponent implements OnInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Output() addressSelected = new EventEmitter<any>();
  @Output() dataChange = new EventEmitter<any>();

  // Состояния
  loading = true;
  error: string | null = null;
  isSaving = false;
  loadingPoints = false;
  loadingCity = false;

  // Адреса
  addresses: Address[] = [];
  selectedAddress: Address | null = null;

  // Режимы
  showAddressList = false;
  showCreateForm = false;
  viewMode: 'list' | 'map' = 'list';

  // Карта
  ymaps: any;
  map: any;
  mapInitialized = false;
  ymapsLoaded = false;
  placemarks: any[] = [];
  pickupPoints: MapPoint[] = [];
  selectedPickupPoint: MapPoint | null = null;
  searchCity = '';
  cityCoordinates: { lat: number; lng: number } | null = null;
  cdekCityCode: number | null = null;

  // Транспортная компания для создания
  selectedTransportCompany: number = 1;

  // Уведомления
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Города для автоподстановки
  citiesFromJson: any[] = [];
  filteredCities: any[] = [];

  // Флаг для отслеживания первого поиска
  hasSearched = false;

  constructor(
    private addressService: AddressesService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadAddresses();
    this.loadCitiesFromJson();
    this.initYmaps();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  private async initYmaps(): Promise<void> {
    try {
      await this.loadYmaps();
      this.ymapsLoaded = true;
    } catch (error) {
      console.error('Ошибка загрузки Яндекс.Карт:', error);
    }
  }

  private async loadCitiesFromJson(): Promise<void> {
    try {
      this.citiesFromJson = await this.http.get<any[]>('/russian-cities.json').toPromise() || [];
    } catch (error) {
      console.error('Ошибка при загрузке городов из JSON:', error);
      this.citiesFromJson = [];
    }
  }

  loadAddresses(): void {
    this.loading = true;
    this.error = null;

    this.addressService.getUserAddresses().subscribe({
      next: (response: any) => {
        this.addresses = (response.data || []).filter((address: Address) => {
          return address?.transportCompanyType != null && address?.transportCompanyType > 0;
        });

        if (this.addresses.length > 0 && !this.selectedAddress) {
          this.selectAddress(this.addresses[0]);
        }
        this.showAddressList = true;
        this.loading = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки адресов:', err);
        this.error = 'Не удалось загрузить пункты выдачи. Попробуйте позже.';
        this.loading = false;
      }
    });
  }

  selectAddress(address: Address): void {
    this.selectedAddress = address;
    this.showAddressList = false;
    this.showCreateForm = false;
    this.emitSelectedAddress();
  }

  showAddressSelection(): void {
    this.showAddressList = true;
    this.showCreateForm = false;
    this.clearMessages();
  }

  cancelSelection(): void {
    this.showAddressList = false;
    this.showCreateForm = false;
    this.clearMessages();
  }

  // Открытие формы создания
  openCreateForm(): void {
    this.showCreateForm = true;
    this.showAddressList = false;
    this.viewMode = 'list';
    this.hasSearched = false;
    this.clearMessages();
    this.pickupPoints = [];
    this.selectedPickupPoint = null;
    this.searchCity = '';
    this.cityCoordinates = null;
    this.mapInitialized = false;
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.destroyMap();
    this.pickupPoints = [];
    this.selectedPickupPoint = null;
    this.placemarks = [];
    this.searchCity = '';
    this.hasSearched = false;
    this.cityCoordinates = null;
    this.mapInitialized = false;
  }

  // Переключение между списком и картой
  async setViewMode(mode: 'list' | 'map'): Promise<void> {
    this.viewMode = mode;

    if (mode === 'map' && !this.mapInitialized && this.hasSearched && this.cityCoordinates && this.ymapsLoaded) {
      await this.initMap();
      if (this.pickupPoints.length > 0) {
        this.addPointsToMap();
      }
    }
  }

  async initMap(): Promise<void> {
    if (!this.mapContainer || this.mapInitialized || !this.ymapsLoaded) return;

    try {
      const center = this.cityCoordinates
        ? [this.cityCoordinates.lat, this.cityCoordinates.lng]
        : [55.7558, 37.6173];

      this.map = new this.ymaps.Map(this.mapContainer.nativeElement, {
        center: center,
        zoom: 12,
        controls: ['zoomControl', 'fullscreenControl']
      });

      this.mapInitialized = true;

      // Добавляем метку города если есть координаты
      if (this.cityCoordinates) {
        this.addCityPlacemark([this.cityCoordinates.lat, this.cityCoordinates.lng], this.searchCity, '');
      }

    } catch (error) {
      console.error('Ошибка инициализации карты:', error);
      this.errorMessage = 'Не удалось загрузить карту';
    }
  }

  private loadYmaps(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.ymaps) {
        window.ymaps.ready(() => {
          this.ymaps = window.ymaps;
          resolve();
        });
      } else {
        const script = document.createElement('script');
        script.src = 'https://api-maps.yandex.ru/2.1/?apikey=ваш_ключ&lang=ru_RU';
        script.onload = () => {
          window.ymaps.ready(() => {
            this.ymaps = window.ymaps;
            resolve();
          });
        };
        script.onerror = () => reject(new Error('Yandex Maps API not loaded'));
        document.head.appendChild(script);
      }
    });
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }
    this.placemarks = [];
    this.mapInitialized = false;
  }

  // Поиск города
  onCitySearch(): void {
    if (this.searchCity && this.searchCity.length >= 2) {
      this.searchCities(this.searchCity);
    } else {
      this.filteredCities = [];
    }
  }

  searchCities(query: string): void {
    if (!query || query.length < 2) {
      this.filteredCities = [];
      return;
    }

    const searchTerm = query.toLowerCase();
    this.filteredCities = this.citiesFromJson
      .filter(city =>
        city.name.toLowerCase().includes(searchTerm) ||
        city.subject.toLowerCase().includes(searchTerm)
      )
      .slice(0, 10);
  }

  selectCityFromAutocomplete(city: any): void {
    this.searchCity = city.name;
    this.filteredCities = [];
    this.loadPickupPoints();
  }

  // Загрузка ПВЗ для выбранного города
  async loadPickupPoints(): Promise<void> {
    if (!this.searchCity || this.searchCity.length < 2) {
      this.errorMessage = 'Введите название города (минимум 2 символа)';
      return;
    }

    this.loadingPoints = true;
    this.errorMessage = null;
    this.hasSearched = true;

    try {
      // Получаем координаты города
      const coords = await this.getCityCoordinates(this.searchCity);

      if (coords) {
        this.cityCoordinates = coords;

        // Загружаем ПВЗ в зависимости от выбранной компании
        if (this.selectedTransportCompany === 1) {
          await this.loadCdekPoints(this.searchCity);
        } else if (this.selectedTransportCompany === 3) {
          await this.loadDellinPoints(this.searchCity);
        } else if (this.selectedTransportCompany === 2) {
          // Для Байкал Сервис пока нет API, показываем сообщение
          this.pickupPoints = [];
          if (this.viewMode === 'map') {
            this.errorMessage = 'Для Байкал Сервис выберите точку на карте вручную';
          }
        }

        this.filteredCities = [];

        // Если режим карты и карта не инициализирована, инициализируем
        if (this.viewMode === 'map' && !this.mapInitialized && this.ymapsLoaded) {
          await this.initMap();
          if (this.pickupPoints.length > 0) {
            this.addPointsToMap();
          }
        } else if (this.viewMode === 'map' && this.mapInitialized && this.pickupPoints.length > 0) {
          // Если карта уже инициализирована, просто добавляем точки
          this.addPointsToMap();
        }
      } else {
        this.errorMessage = 'Город не найден. Проверьте правильность написания';
        this.pickupPoints = [];
      }
    } catch (error) {
      console.error('Ошибка при загрузке ПВЗ:', error);
      this.errorMessage = 'Не удалось загрузить пункты выдачи';
      this.pickupPoints = [];
    } finally {
      this.loadingPoints = false;
    }
  }

  private async getCityCoordinates(cityName: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // Сначала ищем в JSON
      const city = this.findCityInJson(cityName);

      if (city) {
        return {
          lat: parseFloat(city.coords.lat),
          lng: parseFloat(city.coords.lon)
        };
      }

      // Если не нашли в JSON, используем API Яндекс.Карт
      if (!this.ymapsLoaded) {
        await this.initYmaps();
      }

      if (!this.ymaps) {
        return null;
      }

      return new Promise((resolve) => {
        const geocoder = new this.ymaps.geocode(cityName, { results: 1 });

        geocoder.then((res: any) => {
          const firstGeoObject = res.geoObjects.get(0);

          if (firstGeoObject) {
            const coords = firstGeoObject.geometry.getCoordinates();
            resolve({ lat: coords[0], lng: coords[1] });
          } else {
            resolve(null);
          }
        }).catch(() => {
          resolve(null);
        });
      });
    } catch (error) {
      console.error('Ошибка получения координат:', error);
      return null;
    }
  }

  private findCityInJson(cityName: string): any {
    if (!cityName || !this.citiesFromJson.length) return undefined;

    const searchName = cityName.toLowerCase().trim();

    let city = this.citiesFromJson.find(c => c.name.toLowerCase() === searchName);
    if (!city) {
      city = this.citiesFromJson.find(c => c.name.toLowerCase().includes(searchName));
    }
    if (!city) {
      city = this.citiesFromJson.find(c => c.subject.toLowerCase().includes(searchName));
    }

    return city;
  }

  private addCityPlacemark(coords: [number, number], cityName: string, subject: string): void {
    if (!this.map) return;

    // Удаляем старую метку города
    this.placemarks.forEach(pm => {
      if (pm.properties && pm.properties.get('type') === 'city') {
        this.map.geoObjects.remove(pm);
      }
    });

    const cityPlacemark = new this.ymaps.Placemark(coords, {
      balloonContent: `<strong>${cityName}</strong><br>${subject}`,
      type: 'city'
    }, {
      preset: 'islands#circleIcon',
      iconColor: '#327120'
    });

    this.map.geoObjects.add(cityPlacemark);
    this.placemarks.push(cityPlacemark);
  }

  private async loadCdekPoints(city: string): Promise<void> {
    try {
      const cityResponse: any = await this.http.get(
        `https://xn--o1ab.xn--80akonecy.xn--p1ai/transport/cdek/city_code/?city=${encodeURIComponent(city)}`
      ).toPromise();

      if (cityResponse?.code) {
        this.cdekCityCode = cityResponse.code;

        const pointsResponse: any = await this.http.get(
          `https://xn--o1ab.xn--80akonecy.xn--p1ai/transport/cdek/deliverypoints/?city_code=${this.cdekCityCode}&size=1000&page=0`
        ).toPromise();

        if (Array.isArray(pointsResponse)) {
          this.pickupPoints = pointsResponse.map((point: any) => ({
            id: point.code,
            name: point.name,
            address: point.location.address,
            latitude: point.location.latitude,
            longitude: point.location.longitude,
            postal_code: point.location.postal_code,
            work_time: point.work_time,
            phone: point.phones[0]?.number || '',
            code: point.code,
            type: 'cdek'
          } as MapPoint));
        } else {
          this.pickupPoints = [];
        }
      } else {
        this.pickupPoints = [];
      }
    } catch (error) {
      console.error('Ошибка при загрузке точек СДЭК:', error);
      this.pickupPoints = [];
    }
  }

  private async loadDellinPoints(city: string): Promise<void> {
    try {
      const response: any = await this.http.post(
        `https://xn--o1ab.xn--80akonecy.xn--p1ai/transport/dellin/terminalsOnMap?city=${encodeURIComponent(city)}`,
        {}
      ).toPromise();

      if (Array.isArray(response)) {
        this.pickupPoints = response.map((terminal: any) => ({
          id: terminal.id,
          name: terminal.name,
          address: terminal.address,
          latitude: terminal.latitude,
          longitude: terminal.longitude,
          phone: terminal.phone,
          type: 'dellin'
        } as MapPoint));
      } else {
        this.pickupPoints = [];
      }
    } catch (error) {
      console.error('Ошибка при загрузке терминалов Деловых линий:', error);
      this.pickupPoints = [];
    }
  }

  private addPointsToMap(): void {
    if (!this.map) return;

    // Удаляем старые метки ПВЗ
    this.placemarks.forEach(pm => {
      if (pm.properties && pm.properties.get('type') === 'pickup') {
        this.map.geoObjects.remove(pm);
      }
    });

    this.placemarks = this.placemarks.filter(pm => pm.properties && pm.properties.get('type') !== 'pickup');

    // Добавляем новые метки
    this.pickupPoints.forEach(point => {
      if (point.latitude && point.longitude) {
        const placemark = new this.ymaps.Placemark([point.latitude, point.longitude], {
          balloonContent: `
            <div class="map-balloon">
              <strong>${point.name}</strong><br>
              ${point.address}<br>
              ${point.phone ? `📞 ${point.phone}<br>` : ''}
              ${point.work_time ? `🕒 ${point.work_time}` : ''}
            </div>
          `,
          pointId: point.id,
          type: 'pickup'
        }, {
          preset: this.selectedPickupPoint?.id === point.id ? 'islands#redDotIcon' : 'islands#blueDotIcon'
        });

        placemark.events.add('click', () => {
          this.selectPickupPoint(point);
        });

        this.map.geoObjects.add(placemark);
        this.placemarks.push(placemark);
      }
    });

    // Центрируем карту на городе
    if (this.cityCoordinates) {
      this.map.setCenter([this.cityCoordinates.lat, this.cityCoordinates.lng], 12);
    }
  }

  selectPickupPoint(point: MapPoint): void {
    this.selectedPickupPoint = point;

    if (this.viewMode === 'map' && this.map) {
      // Обновляем иконки
      this.placemarks.forEach(pm => {
        if (pm.properties && pm.properties.get('type') === 'pickup') {
          const pointId = pm.properties.get('pointId');
          pm.options.set('preset', pointId === point.id ? 'islands#redDotIcon' : 'islands#blueDotIcon');
        }
      });

      this.map.setCenter([point.latitude, point.longitude], 15);
    }
  }

  selectCompany(company: number): void {
    if (this.selectedTransportCompany === company) return;

    this.selectedTransportCompany = company;

    // Если уже есть поиск, загружаем заново
    if (this.hasSearched && this.searchCity) {
      this.loadPickupPoints();
    }
  }

  // Сохранение выбранного ПВЗ
  saveSelectedPickupPoint(): void {
    if (!this.selectedPickupPoint) {
      this.errorMessage = 'Выберите пункт выдачи';
      return;
    }

    this.isSaving = true;
    const point = this.selectedPickupPoint;

    const addressData: any = {
      city: this.searchCity,
      street: point.address.split(',')[0] || '',
      house: '',
      country: 'Россия',
      system: point.type === 'cdek' ? 'sdek' : point.type === 'dellin' ? 'dellin' : 'web',
      transportCompanyType: this.selectedTransportCompany,
      pickupPointName: point.name,
      pickupPointPhone: point.phone || '',
      pickupPointWorkTime: point.work_time || '',
      latitude: point.latitude,
      longitude: point.longitude,
      comment: ''
    };

    this.addressService.createAddress(addressData)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response: any) => {
          if (response.data) {
            this.addresses.push(response.data);
            this.selectAddress(response.data);
            this.showMessage('Пункт выдачи успешно добавлен', 'success');
            this.closeCreateForm();
          }
        },
        error: (err) => {
          console.error('Ошибка сохранения адреса:', err);
          this.showMessage(err.error?.message || 'Не удалось сохранить пункт выдачи', 'error');
        }
      });
  }

  // Удаление адреса
  deleteAddress(address: Address, event: Event): void {
    event.stopPropagation();

    if (!confirm(`Удалить пункт выдачи "${address.pickupPointName || address.city}"?`)) {
      return;
    }

    if (!address.id) return;

    this.addressService.deleteAddress(address.id).subscribe({
      next: () => {
        this.addresses = this.addresses.filter(a => a.id !== address.id);

        if (this.selectedAddress?.id === address.id) {
          this.selectedAddress = this.addresses.length > 0 ? this.addresses[0] : null;
          if (this.selectedAddress) {
            this.emitSelectedAddress();
          } else {
            this.addressSelected.emit(null);
            this.dataChange.emit({ address: null });
          }
        }

        this.showMessage('Пункт выдачи удален', 'success');
      },
      error: (err) => {
        console.error('Ошибка удаления:', err);
        this.showMessage('Не удалось удалить пункт выдачи', 'error');
      }
    });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    if (type === 'success') {
      this.successMessage = message;
      this.errorMessage = null;
      setTimeout(() => {
        this.successMessage = null;
      }, 3000);
    } else {
      this.errorMessage = message;
      this.successMessage = null;
      setTimeout(() => {
        this.errorMessage = null;
      }, 5000);
    }
  }

  private clearMessages(): void {
    this.successMessage = null;
    this.errorMessage = null;
  }

  private emitSelectedAddress(): void {
    if (this.selectedAddress) {
      const eventData = {
        'type': 'transport',
        'id': this.selectedAddress.id,
        'shopCity': this.selectedAddress.city,
        'shopAddress': this.getFullAddress(this.selectedAddress),
        'companyType': this.selectedAddress.transportCompanyType,
        'addressId': this.selectedAddress.id,
        'companyName': this.getTransportCompanyName(this.selectedAddress.transportCompanyType || 1),
        'pickupPointName': this.selectedAddress.pickupPointName
      };

      this.addressSelected.emit(eventData);
      this.dataChange.emit({ address: this.selectedAddress });
    }
  }

  getFullAddress(address: Address): string {
    if (address.pickupPointName) {
      let addr = address.pickupPointName;
      if (address.city) addr += `, г. ${address.city}`;
      if (address.street) addr += `, ул. ${address.street}`;
      return addr;
    }

    const parts = [];
    if (address.city) parts.push(`г. ${address.city}`);
    if (address.street) parts.push(`ул. ${address.street}`);
    return parts.join(', ') || 'Адрес не указан';
  }

  getTransportCompanyName(type: number): string {
    const names: { [key: number]: string } = {
      1: 'СДЭК',
      2: 'Байкал Сервис',
      3: 'Деловые линии'
    };
    return names[type] || `Компания ${type}`;
  }

  getTransportCompanyIcon(type: number): string {
    const icons: { [key: number]: string } = {
      1: '🚚',
      2: '🚛',
      3: '📦'
    };
    return icons[type] || '📍';
  }

  hasAddress(): boolean {
    return !!this.selectedAddress;
  }
}