import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressesService } from '../../../../../core/api/addresses.service';
import { finalize } from 'rxjs/operators';

interface Address {
  id: string;
  region: string | null;
  area: string | null;
  city: string;
  street: string;
  house: string;
  housing: string | null;
  floorNumber: string | null;
  office: string | null;
  postIndex: string;
  latitude: number | null;
  longitude: number | null;
  system: string;
}

interface NewAddressData {
  city: string;
  street: string;
  house: string;
  housing: string;
  floorNumber: string;
  office: string;
  comment: string;
}

@Component({
  selector: 'app-city-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './city-delivery.component.html',
  styleUrls: ['./city-delivery.component.scss']
})
export class CityDeliveryComponent implements OnInit {
  @Output() addressSelected = new EventEmitter<any>();
  @Output() dataChange = new EventEmitter<any>();

  // Состояния
  loading = true;
  error: string | null = null;
  isSaving = false;

  // Адреса
  addresses: Address[] = [];
  selectedAddress: Address | null = null;

  // Режимы
  showAddressList = false;
  showNewAddressForm = false;

  // Стоимость доставки
  deliveryCost: number = 0;

  // Новый адрес (без postIndex)
  newAddress: NewAddressData = {
    city: '',
    street: '',
    house: '',
    housing: '',
    floorNumber: '',
    office: '',
    comment: ''
  };

  constructor(private addressService: AddressesService) { }

  ngOnInit(): void {
    this.loadAddresses();
    this.generateRandomDeliveryCost();
  }

  /**
   * Генерирует случайную стоимость доставки от 300 до 450 рублей
   */
  private generateRandomDeliveryCost(): void {
    this.deliveryCost = Math.floor(Math.random() * (450 - 300 + 1)) + 300;
  }

  loadAddresses(): void {
    this.loading = true;
    this.error = null;

    this.addressService.getUserAddresses().subscribe({
      next: (response: any) => {
        this.addresses = (response.data || []).filter((address: any) => {
          return address?.transportCompanyType == null ||
            address?.transportCompanyType == 0;
        });
        if (this.addresses.length > 0 && !this.selectedAddress) {
          this.selectAddress(this.addresses[0]);
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки адресов:', err);
        this.error = 'Не удалось загрузить адреса. Попробуйте позже.';
        this.loading = false;
      }
    });
  }

  selectAddress(address: Address): void {
    this.selectedAddress = address;
    this.showAddressList = false;
    this.generateRandomDeliveryCost(); // Обновляем стоимость при выборе адреса
    this.emitSelectedAddress();
  }

  showAddressSelection(): void {
    this.showAddressList = true;
    this.showNewAddressForm = false;
  }

  showAddressForm(): void {
    this.showNewAddressForm = true;
    this.showAddressList = false;
  }

  cancelSelection(): void {
    this.showAddressList = false;
    this.showNewAddressForm = false;
    this.resetNewAddressForm();
  }

  /**
   * Проверка валидности нового адреса
   */
  isNewAddressValid(): boolean {
    return !!(
      this.newAddress.city?.trim() &&
      this.newAddress.street?.trim() &&
      this.newAddress.house?.trim()
    );
  }

  /**
   * Подготовка данных для API
   */
  private prepareAddressForApi(): any {
    // Формируем полный адрес для поля fullName
    const fullName = `г. ${this.newAddress.city}, ул. ${this.newAddress.street}, д. ${this.newAddress.house}${
      this.newAddress.housing ? `, корп. ${this.newAddress.housing}` : ''
    }${this.newAddress.office ? `, офис/кв. ${this.newAddress.office}` : ''}`;

    return {
      city: this.newAddress.city,
      street: this.newAddress.street,
      house: this.newAddress.house,
      housing: this.newAddress.housing || null,
      floorNumber: this.newAddress.floorNumber || null,
      office: this.newAddress.office || null,
      postIndex: '000000', // Заглушка для обязательного поля
      region: null,
      area: null,
      latitude: null,
      longitude: null,
      system: 'web',
      fullName: fullName,
      shortName: fullName.substring(0, 50)
    };
  }

  addNewAddress(): void {
    if (!this.isNewAddressValid()) return;

    this.isSaving = true;
    
    const addressData = this.prepareAddressForApi();

    this.addressService.createAddress(addressData)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response: any) => {
          console.log('Адрес успешно создан:', response);
          
          if (response.data) {
            // Добавляем созданный адрес в список
            this.addresses.push(response.data);
            
            // Выбираем новый адрес
            this.selectAddress(response.data);
            
            // Сбрасываем форму
            this.resetNewAddressForm();
            this.showNewAddressForm = false;
          }
        },
        error: (err) => {
          console.error('Ошибка создания адреса:', err);
          this.error = 'Не удалось сохранить адрес. Попробуйте позже.';
        }
      });
  }

  resetNewAddressForm(): void {
    this.newAddress = {
      city: '',
      street: '',
      house: '',
      housing: '',
      floorNumber: '',
      office: '',
      comment: ''
    };
    this.showNewAddressForm = false;
  }

  private emitSelectedAddress(): void {
    if (this.selectedAddress) {
      this.addressSelected.emit({
        'type': 'city',
        'id': this.selectedAddress.id,
        'shopCity': this.selectedAddress.city,
        'addressId': this.selectedAddress.id,
        'shopAddress': this.getFullAddress(this.selectedAddress),
        'coast': this.deliveryCost
      });
      this.emitDataChange();
    }
  }

  private emitDataChange(): void {
    const data = {
      address: this.selectedAddress,
      deliveryCost: this.deliveryCost,
      deliveryService: 'Yandex'
    };
    this.dataChange.emit(data);
  }

  getFullAddress(address: Address): string {
    const parts = [];

    if (address.city) parts.push(`г. ${address.city}`);
    if (address.street) parts.push(`ул. ${address.street}`);
    if (address.house) parts.push(`д. ${address.house}`);
    if (address.housing) parts.push(`корп. ${address.housing}`);
    if (address.floorNumber) parts.push(`${address.floorNumber} этаж`);
    if (address.office) parts.push(`офис/кв. ${address.office}`);

    return parts.join(', ');
  }

  formatAddressShort(address: Address): string {
    if (address.city && address.street && address.house) {
      return `${address.city}, ${address.street}, ${address.house}`;
    }
    return this.getFullAddress(address);
  }

  hasAddress(): boolean {
    return !!this.selectedAddress;
  }
}