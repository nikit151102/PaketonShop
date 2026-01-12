import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressesService } from '../../../../../core/api/addresses.service';

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

interface DeliveryOption {
  id: string;
  name: string;
  price: number;
  duration: string;
  icon: string;
}

@Component({
  selector: 'app-transport-delivery',
  imports: [CommonModule, FormsModule],
  templateUrl: './transport-delivery.component.html',
  styleUrl: './transport-delivery.component.scss'
})
export class TransportDeliveryComponent implements OnInit {
  @Output() addressSelected = new EventEmitter<string>();
  @Output() dataChange = new EventEmitter<any>();

  // Состояния
  loading = true;
  error: string | null = null;

  // Адреса
  addresses: Address[] = [];
  selectedAddress: Address | null = null;

  // Режимы
  showAddressList = false;
  showNewAddressForm = false;

  // Параметры доставки
  deliveryOptions: DeliveryOption[] = [
    { id: 'standard', name: 'Стандартная доставка', price: 300, duration: '1-2 дня', icon: '🚗' },
    { id: 'express', name: 'Экспресс доставка', price: 600, duration: '3-5 часов', icon: '⚡' },
    { id: 'courier', name: 'Курьер до двери', price: 800, duration: 'В течение дня', icon: '🏃' }
  ];

  selectedDeliveryOption = this.deliveryOptions[0];

  // Новый адрес
  newAddress = {
    city: '',
    street: '',
    house: '',
    housing: '',
    floorNumber: '',
    office: '',
    postIndex: '',
    comment: ''
  };

  constructor(private addressService: AddressesService) { }

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    this.loading = true;
    this.error = null;

    this.addressService.getUserAddresses().subscribe({
      next: (response: any) => {
        this.addresses = (response.data || []).filter((address: any) => {
          return address?.transportCompanyType != null &&
            address?.transportCompanyType > 0;
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
    this.emitSelectedAddress();
  }

  selectDeliveryOption(option: DeliveryOption): void {
    this.selectedDeliveryOption = option;
    this.emitDataChange();
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
  }

  addNewAddress(): void {
    if (!this.validateNewAddress()) return;

    const newAddress: Address = {
      id: `temp_${Date.now()}`,
      city: this.newAddress.city,
      street: this.newAddress.street,
      house: this.newAddress.house,
      housing: this.newAddress.housing || null,
      floorNumber: this.newAddress.floorNumber || null,
      office: this.newAddress.office || null,
      postIndex: this.newAddress.postIndex,
      region: null,
      area: null,
      latitude: null,
      longitude: null,
      system: 'web'
    };

    // Здесь будет вызов API для сохранения адреса
    // this.addressService.createAddress(this.newAddress).subscribe(...)

    this.addresses.push(newAddress);
    this.selectAddress(newAddress);
    this.resetNewAddressForm();
  }

  private validateNewAddress(): boolean {
    return !!this.newAddress.city &&
      !!this.newAddress.street &&
      !!this.newAddress.house &&
      !!this.newAddress.postIndex;
  }

  resetNewAddressForm(): void {
    this.newAddress = {
      city: '',
      street: '',
      house: '',
      housing: '',
      floorNumber: '',
      office: '',
      postIndex: '',
      comment: ''
    };
    this.showNewAddressForm = false;
  }

  private emitSelectedAddress(): void {
    if (this.selectedAddress) {
      this.addressSelected.emit(this.selectedAddress.id);
      this.emitDataChange();
    }
  }

  private emitDataChange(): void {
    const data = {
      address: this.selectedAddress,
      deliveryOption: this.selectedDeliveryOption,
      totalPrice: this.selectedDeliveryOption.price
    };
    this.dataChange.emit(data);
  }

  getFullAddress(address: Address): string {
    const parts = [];

    if (address.city) parts.push(address.city);
    if (address.street) parts.push(`ул. ${address.street}`);
    if (address.house) parts.push(`д. ${address.house}`);
    if (address.housing) parts.push(`корп. ${address.housing}`);
    if (address.floorNumber) parts.push(`${address.floorNumber} этаж`);
    if (address.office) parts.push(`кв. ${address.office}`);
    if (address.postIndex) parts.push(address.postIndex);

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