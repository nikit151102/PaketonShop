import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { StoreService } from './store.service';
import { FormsModule } from '@angular/forms';
import { PhoneLinkPipe } from "./phone-link.pipe";
import { WhatsappLinkPipe } from "./whatsapp-link.pipe";

declare var ymaps: any;

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, PhoneLinkPipe, WhatsappLinkPipe],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss'
})
export class ContactsComponent implements OnInit {
  stores: any[] = [];
  filteredStores: any[] = [];
  selectedCity = 'Барнаул';
  selectedCategory: string = 'Магазин';
  jobCategories = ['Магазин', 'Склад', 'Офис'];
  map: any;
  placemarks: any[] = [];
  phones = [
    '+7 (3852) 555-861',
    '+7 (3852) 555-862',
    '+7 (3852) 555-863',
    '+7 903 937 31 10'
  ];
  whatsapp = '+7 905 084-51-88';
  email = 'paketon@bk.ru';
  vk = 'https://vk.com';
  telegram = 'https://t.me';
  address = 'г. Барнаул, Попова, 165Б';

  form = {
    name: '',
    email: '',
    message: ''
  };

  onSubmit() {
    console.log('Форма отправлена', this.form);
    alert('Спасибо! Ваше сообщение отправлено.');
    this.form = { name: '', email: '', message: '' };
  }

  constructor(public storeService: StoreService) {}

  ngOnInit() {
    this.updateStores();
    setTimeout(() => this.loadMap(), 0);
  }

  updateStores() {
    this.stores = this.storeService.getStoresByCity(this.selectedCity);
    this.filterStores();
  }

  filterStores() {
    this.filteredStores = this.stores.filter(store => store.category === this.selectedCategory);
    this.loadMap();
  }

  loadMap() {
    if (typeof ymaps === 'undefined') {
      console.error('Ошибка: Yandex Maps API не загружен.');
      return;
    }

    ymaps.ready(() => {
      const coordinates = this.storeService.cityCoordinates[this.selectedCity] || [55.76, 37.64];

      if (this.map) {
        this.map.destroy();
      }

      this.map = new ymaps.Map('map', {
        center: coordinates,
        zoom: 11
      });

      this.placemarks = this.filteredStores.map(store => {
        const placemark = new ymaps.Placemark(store.coords, {
          hintContent: store.address,
          balloonContent: `<strong>${store.category}</strong><br>Адрес: ${store.address}<br>Телефон: ${store.phone}`
        });

        this.map.geoObjects.add(placemark);
        return placemark;
      });
    });
  }

  onCityChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedCity = target.value;
    this.updateStores();
  }

  selectStore(store: any) {
    if (!this.map) return;
    this.map.setCenter(store.coords, 15, { duration: 300 });

    this.placemarks.forEach(placemark => {
      placemark.options.set('preset', 'islands#blueIcon');
    });

    const selectedPlacemark = this.placemarks.find(pm => pm.geometry.getCoordinates().toString() === store.coords.toString());
    if (selectedPlacemark) {
      selectedPlacemark.options.set('preset', 'islands#redIcon');
    }
  }

  selectCategory(category: string) {
    if(category == 'Офис' || category == 'Склад'){
      this.selectedCity = 'Барнаул';
      this.updateStores();
    }

    this.selectedCategory = category;
    this.filterStores();
  }
}
