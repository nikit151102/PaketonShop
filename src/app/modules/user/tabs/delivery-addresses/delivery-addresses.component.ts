import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AddressesService } from '../../../../core/api/addresses.service';
import { Address } from '../../../../../models/address.interface';
import { Subject, takeUntil, finalize } from 'rxjs';

declare global {
  interface Window {
    ymaps: any;
  }
}

// Интерфейс для городов из JSON файла
interface CityFromJson {
  coords: {
    lat: string;
    lon: string;
  };
  district: string;
  name: string;
  population: number;
  subject: string;
}

// Интерфейсы для API транспортных компаний
interface CdekPickupPoint {
  code: string;
  name: string;
  location: {
    city: string;
    address: string;
    longitude: number;
    latitude: number;
    postal_code: string;
  };
  work_time: string;
  phones: Array<{ number: string }>;
}

interface DellinTerminal {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
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
  type: 'cdek' | 'dellin' | 'manual';
  full_address?: string;
}

@Component({
  selector: 'app-delivery-addresses',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './delivery-addresses.component.html',
  styleUrls: ['./delivery-addresses.component.scss']
})
export class DeliveryAddressesComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  // Все адреса
  addresses: Address[] = [];

  // Фильтрованные адреса по типу
  personalAddresses: Address[] = [];
  transportCompanyAddresses: Address[] = [];

  // Группировка адресов транспортных компаний
  groupedTransportAddresses: Map<number, Address[]> = new Map();

  // Названия транспортных компаний
  transportCompanyNames: { [key: number]: string } = {
    1: 'СДЭК',
    2: 'Байкал Сервис',
    3: 'Деловые линии'
  };

  // Текущий активный таб
  activeTab: 'personal' | 'transport' = 'personal';

  // Состояния загрузки
  loading = false;
  saving = false;
  deleting = false;
  loadingPoints = false;
  loadingCity = false;
  error: string | null = null;
  success: string | null = null;

  // Модальные окна
  isModalOpen = false;
  isMapModalOpen = false;
  isDeleteConfirmOpen = false;
  isEditing = false;
  editingAddress: Address | null = null;

  // Форма
  addressForm!: FormGroup;
  addressType: 'personal' | 'transport' = 'personal';
  selectedTransportCompany: number = 1; // СДЭК по умолчанию

  // Яндекс Карта
  ymaps: any;
  map: any;
  placemarks: any[] = [];

  // Список ПВЗ для выбора
  pickupPoints: MapPoint[] = [];
  selectedPickupPoint: MapPoint | null = null;
  searchCity = '';
  cityCoordinates: { lat: number; lng: number } | null = null;
  cdekCityCode: number | null = null;

  // Список городов из JSON файла
  citiesFromJson: CityFromJson[] = [];
  filteredCities: CityFromJson[] = [];

  // Для управления подписками
  private destroy$ = new Subject<void>();

  constructor(
    private addressesService: AddressesService,
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadAddresses();
    this.loadCitiesFromJson();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyMap();
  }

  private initializeForm(): void {
    this.addressForm = this.fb.group({
      id: [null],
      region: [''],
      area: [''],
      city: ['', [Validators.required, Validators.minLength(2)]],
      street: [''],
      house: [''],
      housing: [''],
      floorNumber: [''],
      office: [''],
      postIndex: [''],
      latitude: [null],
      longitude: [null],
      system: ['web'],
      transportCompanyType: [0],
      // Эти поля для отображения, но не отправляются
      pickupPointName: [''],
      pickupPointCode: [''],
      pickupPointPhone: [''],
      pickupPointWorkTime: ['']
    });
  }

  private async loadCitiesFromJson(): Promise<void> {
    try {
      this.citiesFromJson = await this.http.get<CityFromJson[]>('/russian-cities.json').toPromise() || [];
      console.log(`Загружено ${this.citiesFromJson.length} городов из JSON файла`);
    } catch (error) {
      console.error('Ошибка при загрузке городов из JSON:', error);
      this.citiesFromJson = [];
    }
  }

  private findCityInJson(cityName: string): CityFromJson | undefined {
    if (!cityName || !this.citiesFromJson.length) return undefined;

    const searchName = cityName.toLowerCase().trim();

    // Ищем точное совпадение
    let city = this.citiesFromJson.find(c =>
      c.name.toLowerCase() === searchName
    );

    // Если не нашли, ищем частичное совпадение
    if (!city) {
      city = this.citiesFromJson.find(c =>
        c.name.toLowerCase().includes(searchName)
      );
    }

    // Если все еще не нашли, ищем среди субъектов
    if (!city) {
      city = this.citiesFromJson.find(c =>
        c.subject.toLowerCase().includes(searchName)
      );
    }

    return city;
  }

  loadAddresses(): void {
    this.loading = true;
    this.error = null;

    this.addressesService.getUserAddresses()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response) => {
          console.log('Получены адреса:', response);
          if (response && response.data) {
            this.addresses = Array.isArray(response.data) ? response.data : [];
          } else {
            this.addresses = [];
          }
          this.filterAndGroupAddresses();
        },
        error: (error) => {
          console.error('Ошибка при загрузке адресов:', error);
          this.error = 'Не удалось загрузить адреса. Пожалуйста, попробуйте позже.';
          this.addresses = [];
        }
      });
  }

  filterAndGroupAddresses(): void {
    this.personalAddresses = this.addresses.filter(address =>
      !address.transportCompanyType || address.transportCompanyType === 0
    );

    this.transportCompanyAddresses = this.addresses.filter(address =>
      address.transportCompanyType && address.transportCompanyType > 0
    );

    this.groupedTransportAddresses = new Map();

    this.transportCompanyAddresses.forEach(address => {
      const companyType = address.transportCompanyType || 1;
      if (!this.groupedTransportAddresses.has(companyType)) {
        this.groupedTransportAddresses.set(companyType, []);
      }
      this.groupedTransportAddresses.get(companyType)?.push(address);
    });
  }

  switchTab(tab: 'personal' | 'transport'): void {
    this.activeTab = tab;
  }

  openAddModal(type: 'personal' | 'transport' = 'personal', companyType?: number): void {
    this.isEditing = false;
    this.editingAddress = null;
    this.addressType = type;

    if (type === 'transport' && companyType) {
      this.selectedTransportCompany = companyType;
    }

    this.addressForm.reset({
      system: 'web',
      transportCompanyType: type === 'personal' ? 0 : this.selectedTransportCompany
    });

    this.isModalOpen = true;
    this.error = null;
    this.success = null;
  }

  openEditModal(address: Address): void {
    this.isEditing = true;
    this.editingAddress = address;
    this.addressType = address.transportCompanyType && address.transportCompanyType > 0 ? 'transport' : 'personal';

    if (address.transportCompanyType) {
      this.selectedTransportCompany = address.transportCompanyType;
    }

    // Заполняем форму данными адреса
    this.addressForm.patchValue({
      id: address.id,
      region: address.region || '',
      area: address.area || '',
      city: address.city || '',
      street: address.street || '',
      house: address.house || '',
      housing: address.housing || '',
      floorNumber: address.floorNumber || '',
      office: address.office || '',
      postIndex: address.postIndex || '',
      latitude: address.latitude || null,
      longitude: address.longitude || null,
      system: address.system || 'web',
      transportCompanyType: address.transportCompanyType || 0,
      // Заполняем отображаемые поля из pickupPointName
      pickupPointName: address.pickupPointName || ''
    });

    this.isModalOpen = true;
    this.error = null;
    this.success = null;
  }

  openMapModal(): void {
    this.isMapModalOpen = true;
    this.searchCity = this.addressForm.get('city')?.value || '';
    this.pickupPoints = [];
    this.selectedPickupPoint = null;

    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  closeMapModal(): void {
    this.isMapModalOpen = false;
    this.destroyMap();
    this.pickupPoints = [];
    this.selectedPickupPoint = null;
    this.placemarks = [];
    this.searchCity = '';
  }

  async loadPickupPoints(): Promise<void> {
    if (!this.searchCity || this.searchCity.length < 2) {
      this.error = 'Введите название города (минимум 2 символа)';
      return;
    }

    this.loadingPoints = true;
    this.error = null;

    try {
      // Сначала центрируем карту на городе
      const success = await this.centerMapOnCityFromJson(this.searchCity);

      if (success && this.cityCoordinates) {
        // Загружаем ПВЗ
        if (this.selectedTransportCompany === 1) {
          await this.loadCdekPoints(this.searchCity);
        } else if (this.selectedTransportCompany === 3) {
          await this.loadDellinPoints(this.searchCity);
        } else if (this.selectedTransportCompany === 2) {
          this.error = 'Для Байкал Сервис выберите точку на карте вручную';
        }

        this.filteredCities = [];
      } else {
        this.error = 'Город не найден в базе данных';
      }

      this.loadingPoints = false;
    } catch (error) {
      console.error('Ошибка при загрузке ПВЗ:', error);
      this.error = 'Не удалось загрузить пункты выдачи';
      this.loadingPoints = false;
    }
  }

  private async centerMapOnCityFromJson(cityName: string): Promise<boolean> {
    if (!this.ymaps || !this.map) return false;

    this.loadingCity = true;
    this.error = null;

    try {
      const city = this.findCityInJson(cityName);

      if (city) {
        const lat = parseFloat(city.coords.lat);
        const lon = parseFloat(city.coords.lon);

        this.cityCoordinates = {
          lat: lat,
          lng: lon
        };

        this.map.setCenter([lat, lon], 12);
        this.addCityPlacemarkFromJson([lat, lon], city.name, city.subject);

        this.loadingCity = false;
        return true;
      } else {
        return await this.centerMapOnCityYandex(cityName);
      }
    } catch (error) {
      console.error('Ошибка при поиске города из JSON:', error);
      this.loadingCity = false;
      this.error = 'Ошибка при поиске города';
      return false;
    }
  }

  private async centerMapOnCityYandex(cityName: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const geocoder = new this.ymaps.geocode(cityName, { results: 1 });

        geocoder.then((res: any) => {
          this.loadingCity = false;
          const firstGeoObject = res.geoObjects.get(0);

          if (firstGeoObject) {
            const coords = firstGeoObject.geometry.getCoordinates();
            const bounds = firstGeoObject.properties.get('boundedBy');

            this.cityCoordinates = {
              lat: coords[0],
              lng: coords[1]
            };

            this.map.setCenter(coords, 12);

            if (bounds) {
              this.map.setBounds(bounds, { checkZoomRange: true });
            }

            this.addCityPlacemark(coords, cityName);
            resolve(true);
          } else {
            this.error = 'Город не найден';
            resolve(false);
          }
        }).catch(() => {
          this.loadingCity = false;
          this.error = 'Ошибка поиска города';
          resolve(false);
        });
      } catch (error) {
        console.error('Ошибка при поиске города через Яндекс:', error);
        this.loadingCity = false;
        this.error = 'Ошибка поиска города';
        resolve(false);
      }
    });
  }

  private addCityPlacemarkFromJson(coords: [number, number], cityName: string, subject: string): void {
    this.placemarks.forEach(pm => {
      if (pm.properties.get('type') === 'city') {
        this.map.geoObjects.remove(pm);
      }
    });

    const cityPlacemark = new this.ymaps.Placemark(coords, {
      balloonContent: `
        <strong>${cityName}</strong><br>
        ${subject}<br>
        Координаты: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}
      `,
      type: 'city'
    }, {
      preset: 'islands#circleIcon',
      iconColor: '#327120'
    });

    this.map.geoObjects.add(cityPlacemark);
    this.placemarks.push(cityPlacemark);
  }

  private addCityPlacemark(coords: [number, number], cityName: string): void {
    this.placemarks.forEach(pm => {
      if (pm.properties.get('type') === 'city') {
        this.map.geoObjects.remove(pm);
      }
    });

    const cityPlacemark = new this.ymaps.Placemark(coords, {
      balloonContent: `<strong>${cityName}</strong><br>Выбранный город`,
      type: 'city'
    }, {
      preset: 'islands#circleIcon',
      iconColor: '#327120'
    });

    this.map.geoObjects.add(cityPlacemark);
    this.placemarks.push(cityPlacemark);
  }

  onCitySearch(): void {
    if (this.searchCity && this.searchCity.length >= 2) {
      this.searchCities(this.searchCity);
    } else {
      this.filteredCities = [];
    }
  }

  triggerCitySearch(): void {
    if (this.searchCity && this.searchCity.length >= 2) {
      if (this.isMapModalOpen && this.map) {
        this.loadPickupPoints();
      }
    }
  }

  private async loadCdekPoints(city: string): Promise<void> {
    try {
      // Получаем код города
      const cityResponse: any = await this.http.get(
        `https://xn--o1ab.xn--80akonecy.xn--p1ai/transport/cdek/city_code/?city=${encodeURIComponent(city)}`
      ).toPromise();

      if (cityResponse?.code) {
        this.cdekCityCode = cityResponse.code;

        // Получаем точки выдачи
        const pointsResponse: any = await this.http.get(
          `https://xn--o1ab.xn--80akonecy.xn--p1ai/transport/cdek/deliverypoints/?city_code=${this.cdekCityCode}&size=1000&page=0`
        ).toPromise();

        if (Array.isArray(pointsResponse)) {
          this.pickupPoints = pointsResponse.map((point: CdekPickupPoint) => ({
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

          this.addPointsToMap();
        } else {
          this.pickupPoints = [];
        }
      } else {
        this.pickupPoints = [];
      }
    } catch (error) {
      console.error('Ошибка при загрузке точек СДЭК:', error);
      this.pickupPoints = [];
      throw error;
    }
  }

  private async loadDellinPoints(city: string): Promise<void> {
    try {
      const response: any = await this.http.post(
        `https://xn--o1ab.xn--80akonecy.xn--p1ai/transport/dellin/terminalsOnMap?city=${encodeURIComponent(city)}`,
        {}
      ).toPromise();

      if (Array.isArray(response)) {
        this.pickupPoints = response.map((terminal: DellinTerminal) => ({
          id: terminal.id,
          name: terminal.name,
          address: terminal.address,
          latitude: terminal.latitude,
          longitude: terminal.longitude,
          phone: terminal.phone,
          type: 'dellin'
        } as MapPoint));

        this.addPointsToMap();
      } else {
        this.pickupPoints = [];
      }
    } catch (error) {
      console.error('Ошибка при загрузке терминалов Деловых линий:', error);
      this.pickupPoints = [];
      throw error;
    }
  }

  private addPointsToMap(): void {
    this.placemarks.forEach(pm => {
      if (pm.properties.get('type') === 'pickup') {
        this.map.geoObjects.remove(pm);
      }
    });

    this.placemarks = this.placemarks.filter(pm => pm.properties.get('type') !== 'pickup');

    this.pickupPoints.forEach(point => {
      if (point.latitude && point.longitude) {
        const placemark = new this.ymaps.Placemark([point.latitude, point.longitude], {
          balloonContent: `
            <strong>${point.name}</strong><br>
            ${point.address}<br>
            ${point.phone ? `Телефон: ${point.phone}<br>` : ''}
            ${point.work_time ? `Время работы: ${point.work_time}` : ''}
          `,
          pointId: point.id,
          type: 'pickup'
        }, {
          preset: 'islands#blueDotIcon'
        });

        placemark.events.add('click', () => {
          const clickedPoint = this.pickupPoints.find(p => p.id === point.id);
          if (clickedPoint) {
            this.selectPickupPoint(clickedPoint);
            this.highlightSelectedPoint(placemark);
          }
        });

        this.map.geoObjects.add(placemark);
        this.placemarks.push(placemark);
      }
    });
  }

  private highlightSelectedPoint(selectedPlacemark: any): void {
    this.placemarks.forEach(pm => {
      if (pm.properties.get('type') === 'pickup') {
        pm.options.set('preset', 'islands#blueDotIcon');
      }
    });

    selectedPlacemark.options.set('preset', 'islands#redIcon');
  }

  selectPickupPoint(point: MapPoint): void {
    this.selectedPickupPoint = point;

    if (this.map && point.latitude && point.longitude) {
      this.map.setCenter([point.latitude, point.longitude], 15);
    }
  }

  useSelectedPickupPoint(): void {
    if (!this.selectedPickupPoint) {
      this.error = 'Выберите пункт выдачи';
      return;
    }

    // Разбираем полный адрес на компоненты
    this.parseAddressFromPickupPoint();

    this.closeMapModal();
  }

  // Главное изменение: парсим адрес из ПВЗ в поля формы
  private parseAddressFromPickupPoint(): void {
    if (!this.selectedPickupPoint) return;

    const point = this.selectedPickupPoint;

    // Для СДЭК есть полный адрес, можно его парсить
    if (point.full_address) {
      // Пример парсинга: "656039, Россия, Алтайский край, Барнаул, ул. Малахова, 83"
      const addressParts = point.full_address.split(', ');

      if (addressParts.length >= 4) {
        // Индекс
        if (addressParts[0]) {
          this.addressForm.patchValue({ postIndex: addressParts[0] });
        }

        // Город (обычно 3-я или 4-я часть)
        const cityPart = addressParts.find(part =>
          !part.match(/^\d+$/) && // не индекс
          !['Россия', 'г.', 'ул.', 'улица', 'дом', 'д.'].includes(part.toLowerCase())
        );

        if (cityPart) {
          this.addressForm.patchValue({ city: cityPart.replace(' г', '').replace('г. ', '') });
        } else {
          this.addressForm.patchValue({ city: this.searchCity });
        }

        // Улица и дом
        const streetAndHouse = addressParts.find(part =>
          part.toLowerCase().includes('ул.') ||
          part.toLowerCase().includes('улица') ||
          part.toLowerCase().includes('пр.') ||
          part.toLowerCase().includes('проспект')
        );

        if (streetAndHouse) {
          const streetMatch = streetAndHouse.match(/(ул\.|улица|пр\.|проспект)\s+(.+)/i);
          if (streetMatch && streetMatch[2]) {
            // Пытаемся выделить номер дома
            const streetParts = streetMatch[2].split(/[\s,]+/);
            if (streetParts.length > 1) {
              this.addressForm.patchValue({
                street: streetParts.slice(0, -1).join(' '),
                house: streetParts[streetParts.length - 1]
              });
            } else {
              this.addressForm.patchValue({ street: streetMatch[2] });
            }
          }
        }
      }
    } else {
      // Для других транспортных компаний или если нет полного адреса
      // Просто заполняем основные поля
      this.addressForm.patchValue({
        city: this.searchCity,
        street: point.address,
        pickupPointName: point.name,
        latitude: point.latitude,
        longitude: point.longitude
      });
    }

    // Заполняем дополнительные данные для отображения
    this.addressForm.patchValue({
      pickupPointName: point.name,
      pickupPointCode: point.code || point.id,
      pickupPointPhone: point.phone || '',
      pickupPointWorkTime: point.work_time || '',
      latitude: point.latitude,
      longitude: point.longitude
    });
  }

  async initMap(): Promise<void> {
    if (!this.mapContainer) return;

    try {
      await this.loadYmaps();

      this.map = new this.ymaps.Map(this.mapContainer.nativeElement, {
        center: [55.7558, 37.6173],
        zoom: 5,
        controls: ['zoomControl', 'fullscreenControl', 'searchControl']
      });

      this.map.controls.get('searchControl').options.set({
        provider: 'yandex#search',
        noPlacemark: true
      });

      this.map.events.add('click', (e: any) => {
        const coords = e.get('coords');
        this.addManualPlacemark(coords[0], coords[1], 'Ручной выбор');
      });

      if (this.searchCity && this.searchCity.length >= 2) {
        this.centerMapOnCityFromJson(this.searchCity);
      }

    } catch (error) {
      console.error('Ошибка инициализации карты:', error);
      this.error = 'Не удалось загрузить карту';
    }
  }

  private addManualPlacemark(lat: number, lng: number, title: string): void {
    this.placemarks.forEach(pm => {
      if (pm.properties.get('type') === 'manual') {
        this.map.geoObjects.remove(pm);
      }
    });

    const manualPlacemark = new this.ymaps.Placemark([lat, lng], {
      balloonContent: title,
      type: 'manual'
    }, {
      preset: 'islands#redIcon'
    });

    this.map.geoObjects.add(manualPlacemark);
    this.placemarks.push(manualPlacemark);

    this.map.setCenter([lat, lng], 15);

    const manualPoint: MapPoint = {
      id: 'manual_' + Date.now(),
      name: title,
      address: 'Выбрано на карте',
      latitude: lat,
      longitude: lng,
      type: 'manual'
    };

    this.pickupPoints.push(manualPoint);
    this.selectedPickupPoint = manualPoint;

    // Заполняем форму координатами
    this.addressForm.patchValue({
      latitude: lat,
      longitude: lng
    });
  }

  private loadYmaps(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.ymaps) {
        window.ymaps.ready(() => {
          this.ymaps = window.ymaps;
          resolve();
        });
      } else {
        reject(new Error('Yandex Maps API not loaded'));
      }
    });
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }
    this.placemarks = [];
  }

  saveAddress(): void {
    if (this.addressForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;
    this.success = null;
    // Подготавливаем данные для отправки
    const formValue = this.addressForm.value;
    const transportCompanyType = this.addressType === 'personal' ? 0 : this.selectedTransportCompany;

    // Объект для маппинга transportCompanyType -> system
    const systemMapping: { [key: number]: string } = {
      1: 'sdek',
      2: 'baikal',
      3: 'dellin'
    };

    // Определяем значение для поля system
    const systemValue = this.addressType === 'personal'
      ? 'web'
      : (systemMapping[transportCompanyType] || 'web');

    const addressData: Address = {
      id: formValue.id,
      region: this.addressType === 'personal' ? formValue.region : '',
      area: this.addressType === 'personal' ? formValue.area : '',
      city: formValue.city,
      street: formValue.street || '',
      house: formValue.house || '',
      housing: this.addressType === 'personal' ? formValue.housing : '',
      floorNumber: this.addressType === 'personal' ? formValue.floorNumber : '',
      office: this.addressType === 'personal' ? formValue.office : '',
      postIndex: formValue.postIndex || '',
      latitude: formValue.latitude,
      longitude: formValue.longitude,
      system: systemValue, // Используем вычисленное значение
      transportCompanyType: transportCompanyType,
      // Важное изменение: сохраняем название ПВЗ в pickupPointName
      pickupPointName: this.addressType === 'transport' ? formValue.pickupPointName : ''
    };

    console.log('Отправляемые данные:', addressData);

    const saveOperation = this.isEditing && addressData.id
      ? this.addressesService.updateAddress(addressData)
      : this.addressesService.createAddress(addressData);

    saveOperation
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.saving = false)
      )
      .subscribe({
        next: (response) => {
          console.log('Ответ от сервера:', response);
          this.success = this.isEditing
            ? 'Адрес успешно обновлен!'
            : 'Новый адрес успешно добавлен!';

          this.isModalOpen = false;
          this.loadAddresses();

          setTimeout(() => {
            this.success = null;
          }, 3000);
        },
        error: (error) => {
          console.error('Ошибка при сохранении адреса:', error);
          this.error = this.isEditing
            ? 'Не удалось обновить адрес. Пожалуйста, попробуйте снова.'
            : 'Не удалось создать адрес. Пожалуйста, проверьте данные и попробуйте снова.';

          if (error.error && error.error.message) {
            this.error += ` Ошибка: ${error.error.message}`;
          }
        }
      });
  }

  confirmDelete(address: Address): void {
    this.editingAddress = address;
    this.isDeleteConfirmOpen = true;
    this.error = null;
  }

  deleteAddress(): void {
    if (!this.editingAddress?.id) return;

    this.deleting = true;
    this.error = null;

    this.addressesService.deleteAddress(this.editingAddress.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.deleting = false)
      )
      .subscribe({
        next: () => {
          this.isDeleteConfirmOpen = false;
          this.loadAddresses();

          this.success = 'Адрес успешно удален!';
          setTimeout(() => {
            this.success = null;
          }, 3000);
        },
        error: (error) => {
          console.error('Ошибка при удалении адреса:', error);
          this.error = 'Не удалось удалить адрес. Пожалуйста, попробуйте позже.';
        }
      });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.addressForm.reset({
      system: 'web',
      transportCompanyType: 0
    });
    this.error = null;
    this.success = null;
  }

  closeDeleteConfirm(): void {
    this.isDeleteConfirmOpen = false;
    this.editingAddress = null;
    this.error = null;
  }

  private markFormAsTouched(): void {
    Object.values(this.addressForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  getFullAddress(address: Address): string {
    if (address.transportCompanyType && address.transportCompanyType > 0) {
      return address.pickupPointName || `ПВЗ ${this.transportCompanyNames[address.transportCompanyType]}`;
    }

    const parts = [
      address.city,
      address.street,
      address.house,
      address.housing ? `к. ${address.housing}` : '',
      address.office ? `кв. ${address.office}` : ''
    ].filter(part => part && part.trim() !== '');

    return parts.join(', ');
  }

  getShortAddress(address: Address): string {
    if (address.transportCompanyType && address.transportCompanyType > 0) {
      return address.pickupPointName || `ПВЗ ${this.transportCompanyNames[address.transportCompanyType]}`;
    }
    return `${address.city}, ${address.street} ${address.house}`;
  }

  getTransportCompanyName(type: number): string {
    return this.transportCompanyNames[type] || `Компания ${type}`;
  }

  getTransportCompanyIcon(type: number): string {
    const icons: { [key: number]: string } = {
      1: '🚚',
      2: '🚛',
      3: '📦'
    };
    return icons[type] || '📍';
  }

  isPickupPoint(address: Address): boolean {
    return !!(address.transportCompanyType && address.transportCompanyType > 0);
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

  selectCityFromAutocomplete(city: CityFromJson): void {
    this.searchCity = city.name;
    this.filteredCities = [];

    if (this.isMapModalOpen && this.map) {
      this.loadPickupPoints();
    }
  }

  getAddressDetails(address: Address): string {
    if (this.isPickupPoint(address)) {
      return `Пункт выдачи: ${address.pickupPointName || 'Не указано'}`;
    } else {
      return `Улица: ${address.street}, Дом: ${address.house}`;
    }
  }
}