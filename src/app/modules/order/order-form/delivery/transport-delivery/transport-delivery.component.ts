import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AddressesService } from '../../../../../core/api/addresses.service';
import { finalize } from 'rxjs/operators';
import { Address, TransportCompanies } from '../../../../../../models/address.interface';

@Component({
  selector: 'app-transport-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './transport-delivery.component.html',
  styleUrls: ['./transport-delivery.component.scss']
})
export class TransportDeliveryComponent implements OnInit {
  @Output() addressSelected = new EventEmitter<any>();
  @Output() dataChange = new EventEmitter<any>();

  // Состояния
  loading = true;
  error: string | null = null;
  isSaving = false;
  isModalOpen = false;
  isEditing = false;

  // Адреса
  addresses: Address[] = [];
  selectedAddress: Address | null = null;
  editingAddress: Address | null = null;

  // Режимы
  showAddressList = false;
  showNewAddressForm = false;

  // Форма
  addressForm!: FormGroup;
  selectedTransportCompany: number = 1;

  // Используем константу из интерфейса
  transportCompanyNames = TransportCompanies;

  constructor(
    private addressService: AddressesService,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  private initializeForm(): void {
    this.addressForm = this.fb.group({
      id: [null],
      region: [''],
      area: [''],
      city: ['', Validators.required],
      street: ['', Validators.required],
      house: ['', Validators.required],
      housing: [''],
      floorNumber: [''],
      office: [''],
      postIndex: [''],
      country: ['Россия'],
      latitude: [null],
      longitude: [null],
      pickupPointName: [''],
      pickupPointPhone: [''], // Добавлен недостающий control
      pickupPointWorkTime: [''], // Добавлен недостающий control
      transportCompanyType: [1, Validators.required],
      system: ['web'],
      comment: [''] // Добавлен для комментария
    });
  }

  loadAddresses(): void {
    this.loading = true;
    this.error = null;

    this.addressService.getUserAddresses().subscribe({
      next: (response: any) => {
        // Фильтруем только адреса транспортных компаний (transportCompanyType > 0)
        this.addresses = (response.data || []).filter((address: Address) => {
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
        this.error = 'Не удалось загрузить пункты выдачи. Попробуйте позже.';
        this.loading = false;
      }
    });
  }

  selectAddress(address: Address): void {
    this.selectedAddress = address;
    this.showAddressList = false;
    this.emitSelectedAddress();
  }

  selectCompany(company: number): void {
    this.selectedTransportCompany = company;
    this.addressForm.patchValue({ transportCompanyType: company });
  }

  showAddressSelection(): void {
    this.showAddressList = true;
    this.showNewAddressForm = false;
  }

  cancelSelection(): void {
    this.showAddressList = false;
    this.showNewAddressForm = false;
  }

  openAddModal(address?: Address): void {
    if (address) {
      this.isEditing = true;
      this.editingAddress = address;
      this.selectedTransportCompany = address.transportCompanyType || 1;
      
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
        country: address.country || 'Россия',
        latitude: address.latitude || null,
        longitude: address.longitude || null,
        pickupPointName: address.pickupPointName || '',
        pickupPointPhone: (address as any).pickupPointPhone || '',
        pickupPointWorkTime: (address as any).pickupPointWorkTime || '',
        transportCompanyType: address.transportCompanyType || 1,
        system: address.system || 'web',
        comment: (address as any).comment || ''
      });
    } else {
      this.isEditing = false;
      this.editingAddress = null;
      this.addressForm.reset({
        country: 'Россия',
        transportCompanyType: this.selectedTransportCompany,
        system: 'web',
        pickupPointPhone: '',
        pickupPointWorkTime: '',
        comment: ''
      });
    }
    
    this.isModalOpen = true;
    this.error = null;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.addressForm.reset({
      country: 'Россия',
      transportCompanyType: 1,
      system: 'web',
      pickupPointPhone: '',
      pickupPointWorkTime: '',
      comment: ''
    });
    this.error = null;
  }

  saveAddress(): void {
    if (this.addressForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    this.isSaving = true;
    this.error = null;

    const formValue = this.addressForm.value;
    
    // Подготавливаем данные в соответствии с интерфейсом Address
    const addressData: any = {
      id: formValue.id,
      region: formValue.region || '',
      area: formValue.area || '',
      city: formValue.city,
      street: formValue.street,
      house: formValue.house,
      housing: formValue.housing || undefined,
      floorNumber: formValue.floorNumber || undefined,
      office: formValue.office || undefined,
      postIndex: formValue.postIndex || undefined,
      country: formValue.country || 'Россия',
      latitude: formValue.latitude || undefined,
      longitude: formValue.longitude || undefined,
      system: formValue.system || 'web',
      transportCompanyType: formValue.transportCompanyType,
      pickupPointName: formValue.pickupPointName || undefined,
      pickupPointPhone: formValue.pickupPointPhone || undefined,
      pickupPointWorkTime: formValue.pickupPointWorkTime || undefined,
      comment: formValue.comment || undefined
    };

    // Если это новый адрес, удаляем id
    if (!this.isEditing) {
      delete addressData.id;
    }

    const saveOperation = this.isEditing && addressData.id
      ? this.addressService.updateAddress(addressData)
      : this.addressService.createAddress(addressData);

    saveOperation
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response: any) => {
          if (response.data) {
            if (this.isEditing) {
              const index = this.addresses.findIndex(a => a.id === response.data.id);
              if (index !== -1) {
                this.addresses[index] = response.data;
              }
            } else {
              this.addresses.push(response.data);
            }
            
            this.selectAddress(response.data);
            this.closeModal();
          }
        },
        error: (err) => {
          console.error('Ошибка сохранения адреса:', err);
          this.error = 'Не удалось сохранить пункт выдачи. Попробуте позже.';
          
          if (err.error?.message) {
            this.error = err.error.message;
          }
        }
      });
  }

  private markFormAsTouched(): void {
    Object.values(this.addressForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  private emitSelectedAddress(): void {
    if (this.selectedAddress) {
      const eventData = {
        'type': 'transport',
        'id': this.selectedAddress.id,
        'shopCity': this.selectedAddress.city,
        'shopAddress': this.getFullAddress(this.selectedAddress),
        'companyType': this.selectedAddress.transportCompanyType,
        'companyName': this.getTransportCompanyName(this.selectedAddress.transportCompanyType || 1),
        'pickupPointName': this.selectedAddress.pickupPointName
      };
      
      this.addressSelected.emit(eventData);
      this.emitDataChange();
    }
  }

  private emitDataChange(): void {
    const data = {
      address: this.selectedAddress
    };
    this.dataChange.emit(data);
  }

  getFullAddress(address: Address): string {
    const parts = [];

    if (address.country) parts.push(address.country);
    if (address.region) parts.push(address.region);
    if (address.area) parts.push(address.area);
    if (address.city) parts.push(`г. ${address.city}`);
    if (address.street) parts.push(`ул. ${address.street}`);
    if (address.house) parts.push(`д. ${address.house}`);
    if (address.housing) parts.push(`корп. ${address.housing}`);
    if (address.floorNumber) parts.push(`${address.floorNumber} этаж`);
    if (address.office) parts.push(`офис/кв. ${address.office}`);
    if (address.postIndex) parts.push(address.postIndex);
    
    const addressStr = parts.join(', ');
    
    if (address.pickupPointName) {
      return `${address.pickupPointName} (${addressStr})`;
    }
    
    return addressStr;
  }

  getTransportCompanyName(type: number): string {
    return this.transportCompanyNames[type as keyof typeof TransportCompanies] || `Компания ${type}`;
  }

  getTransportCompanyIcon(type: number): string {
    const icons: { [key: number]: string } = {
      1: '🚚',  // СДЭК
      2: '🚛',  // Байкал Сервис
      3: '📦'   // Деловые линии
    };
    return icons[type] || '📍';
  }

  hasAddress(): boolean {
    return !!this.selectedAddress;
  }

  // Вспомогательный метод для проверки типа транспортной компании
  isSdek(address: Address): boolean {
    return address.transportCompanyType === 1;
  }

  isBaikal(address: Address): boolean {
    return address.transportCompanyType === 2;
  }

  isDellin(address: Address): boolean {
    return address.transportCompanyType === 3;
  }
}