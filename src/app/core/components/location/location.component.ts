import { Component, OnInit } from '@angular/core';
import { LocationService, City, DistrictGroup } from './location.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { UserDataService } from '../../services/user-data.service';

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

  constructor(
    public locationService: LocationService,
    private userDataService: UserDataService
  ) {}

  async ngOnInit() {
    // Инициализация сервиса локации
    await this.locationService.init();

    // Получаем город из данных устройства
    const deviceCity = this.userDataService.getCurrentCity();
    this.detectedCity$.next(deviceCity);

    // Пытаемся найти совпадение в базе городов
    const allCities = this.locationService.getAvailableCities();
    const matchedCity = allCities.find((city:any) => 
      city.name.toLowerCase().includes(deviceCity.toLowerCase()) ||
      deviceCity.toLowerCase().includes(city.name.toLowerCase())
    );

    if (matchedCity) {
      this.city$.next(matchedCity);
      this.locationService.setCity(matchedCity);
      
      // Обновляем город в userDataService
      this.userDataService.setCity(matchedCity.name);
    }

    // Подписываемся на изменения
    this.locationService.city$.subscribe((city:any) => {
      this.city$.next(city);
      if (city) {
        this.userDataService.setCity(city.name);
      }
    });

    this.locationService.showCityModal$.subscribe(show => {
      this.showCityModal$.next(show);
    });
  }

  openCityListModal() {
    this.locationService.openCityListModal();
  }

  setCity(city: City) {
    this.locationService.setCity(city);
    this.userDataService.setCity(city.name);
    this.showCityModal$.next(false);
  }

  confirmCity() {
    this.locationService.confirmCity();
    const city = this.locationService.getCurrentCity();
    if (city) {
      this.userDataService.setCity(city.name);
    }
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

  /**
   * Использовать город, определенный по устройству
   */
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
        // Создаем временный город, если не нашли в базе
        const tempCity: any = {
          id: 'detected_' + Date.now(),
          name: deviceCity,
          districts: []
        };
        this.setCity(tempCity);
      }
    }
  }
}