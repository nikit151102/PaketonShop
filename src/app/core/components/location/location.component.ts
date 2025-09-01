import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

interface City {
  coords: { lat: string; lon: string };
  district: string;
  name: string;
  population: number;
  subject: string;
}

interface DistrictGroup {
  name: string;
  cities: City[];
  expanded: boolean;
}

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss'],
})
export class LocationComponent implements OnInit {
  city: string | null = null;
  detectedCity: string | null = null;
  showCityModal = false;

  cities: City[] = [];
  groupedCities: Record<string, City[]> = {};

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.http.get<City[]>('/russian-cities.json').subscribe(data => {
      this.cities = data;
      this.groupCities();
      this.checkLocation();
    });
  }

  groupedDistricts: DistrictGroup[] = [];

groupCities() {
  const grouped = this.cities.reduce((acc, city) => {
    if (!acc[city.subject]) acc[city.subject] = [];
    acc[city.subject].push(city);
    return acc;
  }, {} as Record<string, City[]>);

  this.groupedDistricts = Object.keys(grouped).map(subject => ({
    name: subject,          // теперь это "Московская область", "Алтайский край"
    cities: grouped[subject],
    expanded: false
  }));
}


  openCityListModal() {
    this.groupedDistricts.forEach(d => d.expanded = false);
    this.showCityModal = true;
  }

  checkLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => this.getCityFromCoords(pos.coords.latitude, pos.coords.longitude),
        () => console.warn('Не удалось получить геолокацию')
      );
    }
  }

async getCityFromCoords(lat: number, lon: number) {
  this.http.get<any>(`/nominatim/reverse?lat=${lat}&lon=${lon}&format=json`)
    .subscribe({
      next: data => {
        this.detectedCity =
          data.address.city || data.address.town || data.address.village;
      },
      error: err => {
        console.error('Ошибка геокодинга', err);
      }
    });
}


  confirmCity() {
    this.city = this.detectedCity;
  }

  setCity(city: City) {
    this.city = city.name;
    this.showCityModal = false;
  }
}
