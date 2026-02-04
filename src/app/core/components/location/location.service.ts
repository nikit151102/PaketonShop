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
  id?: string; // Добавляем id для совместимости
}

export interface DistrictGroup {
  name: string;
  cities: City[];
  showAll: boolean;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  getDeviceInfo() {
    throw new Error('Method not implemented.');
  }
  localStorage_city = 'pktn_userCity';
  city$ = new BehaviorSubject<City | null>(null); // Изменено на City | null
  detectedCity$ = new BehaviorSubject<string | null>(null);
  showCityModal$ = new BehaviorSubject<boolean>(false);
  currentSession$ = new BehaviorSubject<string | null>(null);
  cities: City[] = [];
  groupedDistricts: DistrictGroup[] = [];
  selectedDistrict: DistrictGroup | null = null;

  citySearch: string = '';

  constructor(private http: HttpClient) {}

  async init() {
    if (!this.cities.length) {
      const data = await firstValueFrom(
        this.http.get<City[]>('/russian-cities.json'),
      );
      // Добавляем id к городам для совместимости
      this.cities = data.map((city, index) => ({
        ...city,
        id: `city_${index}` // Генерируем id если его нет
      }));
      this.groupCities();
      this.detectUserCity();
    }
  }

  // Добавляем метод для получения всех городов
  getAvailableCities(): City[] {
    return this.cities;
  }

  // Добавляем метод для получения текущего города
  getCurrentCity(): City | null {
    return this.city$.value;
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
    this.selectedDistrict = null;
    this.showCityModal$.next(true);
  }

  setCity(city: City) {
    this.city$.next(city);
    localStorage.setItem(this.localStorage_city, city.name);
    this.selectedDistrict = null;
    this.showCityModal$.next(false);
    StorageUtils.setSessionStorage(this.localStorage_city, 'true');
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
  }

  // фильтрация областей
  filteredDistricts(): DistrictGroup[] {
    if (!this.citySearch) return this.groupedDistricts;

    const search = this.citySearch.toLowerCase();
    return this.groupedDistricts.filter(
      (d) =>
        d.name.toLowerCase().startsWith(search) ||
        d.cities.some((c) => c.name.toLowerCase().startsWith(search)),
    );
  }

  // фильтрация городов выбранной области
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

  // Метод для установки города по имени
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
        
        // Пытаемся найти город в списке
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