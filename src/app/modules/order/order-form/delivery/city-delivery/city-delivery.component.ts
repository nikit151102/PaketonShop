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

  // Уведомления
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Новый адрес
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
        this.showAddressList = true;
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
    this.generateRandomDeliveryCost();
    this.emitSelectedAddress();
  }

  showAddressSelection(): void {
    this.showAddressList = true;
    this.showNewAddressForm = false;
    this.clearMessages();
  }

  showAddressForm(): void {
    this.showNewAddressForm = true;
    this.showAddressList = false;
    this.clearMessages();
    this.resetNewAddressForm();
  }

  cancelSelection(): void {
    this.showAddressList = false;
    this.showNewAddressForm = false;
    this.resetNewAddressForm();
    this.clearMessages();
  }

  isNewAddressValid(): boolean {
    return !!(
      this.newAddress.city?.trim() &&
      this.newAddress.street?.trim() &&
      this.newAddress.house?.trim()
    );
  }

  private prepareAddressForApi(): any {
    const fullName = `г. ${this.newAddress.city}, ул. ${this.newAddress.street}, д. ${this.newAddress.house}${this.newAddress.housing ? `, корп. ${this.newAddress.housing}` : ''
      }${this.newAddress.office ? `, офис/кв. ${this.newAddress.office}` : ''}`;

    return {
      city: this.newAddress.city,
      street: this.newAddress.street,
      house: this.newAddress.house,
      housing: this.newAddress.housing || null,
      floorNumber: this.newAddress.floorNumber || null,
      office: this.newAddress.office || null,
      postIndex: '000000',
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
          if (response.data) {
            this.addresses.push(response.data);
            this.selectAddress(response.data);
            this.resetNewAddressForm();
            this.showNewAddressForm = false;
            this.showMessage('Адрес успешно добавлен', 'success');
          }
        },
        error: (err) => {
          console.error('Ошибка создания адреса:', err);
          this.showMessage(err.error?.message || 'Не удалось сохранить адрес', 'error');
        }
      });
  }

  deleteAddress(address: Address, event: Event): void {
    event.stopPropagation();

    if (!confirm(`Удалить адрес "${this.getFullAddress(address)}"?`)) {
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

        this.showMessage('Адрес удален', 'success');
      },
      error: (err) => {
        console.error('Ошибка удаления:', err);
        this.showMessage('Не удалось удалить адрес', 'error');
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

  hasAddress(): boolean {
    return !!this.selectedAddress;
  }
}