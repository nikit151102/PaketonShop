import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { User, UserService } from '../../../core/services/user.service';
import { PickupDeliveryComponent } from './delivery/pickup-delivery/pickup-delivery.component';
import { TransportDeliveryComponent } from './delivery/transport-delivery/transport-delivery.component';
import { CityDeliveryComponent } from './delivery/city-delivery/city-delivery.component';
import { CompanySelectorComponent } from './company-selector/company-selector.component';
import { TruncatePipe } from "./truncate.pipe";
import { ContactTypeEnum, ContactTypeSelectorComponent } from './contact-type-selector/contact-type-selector.component';

interface Company {
  id: number;
  name: string;
  inn: string;
}

interface ProductAvailability {
  productId: string;
  productName: string;
  requiredQty: number;
  availableQty: number;
  isAvailable: boolean;
  storeId: string;
  storeName: string;
}

@Component({
  selector: 'app-order-form',
  imports: [CommonModule, FormsModule, PickupDeliveryComponent, TransportDeliveryComponent, CityDeliveryComponent, CompanySelectorComponent, TruncatePipe, ContactTypeSelectorComponent],
  templateUrl: './order-form.component.html',
  styleUrl: './order-form.component.scss',
})
export class OrderFormComponent implements OnInit {
  @Input() userBasketId: string | null = '';
  @Input() orderData: any;
  @Input() orderProducts: any[] = [];
  @Output() orderCreated = new EventEmitter<any>();
  @Output() orderUpdated = new EventEmitter<any>();
  @Output() orderDelivery = new EventEmitter<any>();
  @Output() orderCompany = new EventEmitter<any>();
  @Output() formChanged = new EventEmitter<any>();
  @Output() deliveryCost = new EventEmitter<any>();

  // Данные пользователя
  currentUserData: any = null;
  isEditing = false;
  isSubmitting = false;
  selectedCompanyId: string | null = null;

  // Форма
  formData = {
    lastName: '',
    firstName: '',
    middleName: '',
    phone: '',
    email: '',
    info: '',
    needConsult: false,
    agreement: false,
    personType: 'fiz',
    delivery: 'pickup',
    contactType: 0
  };

  selectedContactType = ContactTypeEnum.Call;

  onContactTypeChange(value: number): void {
    console.log('Выбран тип связи:', value);
    // value: 0 - позвонить, 1 - заменить, 2 - удалить
    this.formData.contactType = value
    this.formChanged.emit(this.formData);
    switch (value) {
      case ContactTypeEnum.Call:
        console.log('Будет звонок клиенту');
        break;
      case ContactTypeEnum.DoNotCallAndReplace:
        console.log('Замена на аналог без звонка');
        break;
      case ContactTypeEnum.DoNotCallAndDelete:
        console.log('Удаление позиции без звонка');
        break;
    }
  }

  // Для оптимизации отправки (дебаунс)
  private formChangeSubject = new Subject<any>();

  companies: Company[] = [
    { id: 1, name: 'ООО "Пример"', inn: '0000000000' },
    { id: 2, name: 'ООО "Логистика"', inn: '0000000000' },
  ];

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.userService.user$.subscribe((user: any) => {
      this.currentUserData = user;
      if (user) {
        this.prefillFormData(user);
      }
    });

    // Подписываемся на изменения с дебаунсом
    this.formChangeSubject
      .pipe(
        debounceTime(300), // Задержка 300 мс перед отправкой
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe(formData => {
        this.formChanged.emit(formData);
      });
  }

  orderDeliveryData: any;
  allStores: any[] = [];
  selectedStoreId: string | null = null;

  // Результаты проверки наличия
  availabilityCheck: {
    allAvailable: boolean;
    availableProducts: ProductAvailability[];
    unavailableProducts: ProductAvailability[];
    alternativeStores: Array<{
      storeId: string;
      storeName: string;
      storeAddress: string;
      availableCount: number;
      totalProducts: number;
      products: ProductAvailability[];
    }>;
    bestAlternativeStore: any;
  } | null = null;

  // Метод для отслеживания изменений в форме
  onFormChange(): void {
    const formDataCopy = { ...this.formData };

    // Добавляем ID выбранной компании если есть
    const payload = {
      ...formDataCopy,
      selectedCompanyId: this.selectedCompanyId,
      orderDeliveryData: this.orderDeliveryData
    };

    this.formChangeSubject.next(payload);
  }

  prefillFormData(user: any) {
    this.formData = {
      lastName: user.lastName || '',
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      phone: user.phoneNumber || '',
      email: user.email || '',
      info: '',
      needConsult: false,
      agreement: false,
      personType: 'fiz',
      delivery: 'pickup',
      contactType: 0
    };

    // Отправляем начальные данные
    setTimeout(() => this.onFormChange(), 0);
  }

  getInitials(): string {
    if (!this.currentUserData) return '?';

    const first = this.currentUserData.firstName?.[0] || '';
    const last = this.currentUserData.lastName?.[0] || '';

    return (first + last).toUpperCase() || 'U';
  }

  selectDelivery(type: string) {
    this.formData.delivery = type;
    this.onFormChange();
  }

  onDeliveryDataChange(type: string, data: any) {
    console.log('onDeliveryDataChange called with type:', type, 'data:', data);

    this.orderDelivery.emit({
      'type': type,
      'id': data.id,
      'shopCity': data?.address?.city ? data.address.city : undefined,
      'shopAddress': data.fullName
    });

    this.orderDeliveryData = {
      'type': type,
      'id': data.id
    };
    this.deliveryCost.emit(data.coast);
    // ИСПРАВЛЕНИЕ: проверяем что type содержит 'pickup' или равен 'store'
    if ((type === 'pickup' || type === 'store') && data.id) {
      this.selectedStoreId = data.id;
      console.log('Setting selectedStoreId to:', data.id);
      this.checkAvailabilityInSelectedStore();
    }

    this.onFormChange();

    console.log('selectedStoreId:', this.selectedStoreId);
    console.log('allStores:', this.allStores);
    console.log('orderProducts:', this.orderProducts);
    console.log('availabilityCheck:', this.availabilityCheck);
  }

  startEditing() {
    this.isEditing = true;
  }

  cancelEditing() {
    this.isEditing = false;
    this.prefillFormData(this.currentUserData);
  }

  onCompanySelected(companyId: string | null): void {
    this.selectedCompanyId = companyId;

    if (companyId) {
      this.formData.personType = 'jur';
      this.loadCompanyDetails(companyId);
    }

    this.onFormChange();
    console.log('orderProducts', this.orderProducts)
  }

  getAllStores(data: any) {
    this.allStores = data;
    console.log('allStores', data)

    // Если уже выбран магазин, проверяем наличие
    if (this.selectedStoreId) {
      this.checkAvailabilityInSelectedStore();
    }
  }

  onCompanyAdded(): void {
    console.log('Компания добавлена');
    this.onFormChange();
  }

  onCompanyEdited(company: any): void {
    console.log('Компания отредактирована:', company);
    this.onFormChange();
  }

  onCompanyDeleted(companyId: string): void {
    console.log('Компания удалена:', companyId);

    if (this.selectedCompanyId === companyId) {
      this.selectedCompanyId = null;
      this.formData.personType = 'fiz';
    }

    this.onFormChange();
  }

  private loadCompanyDetails(companyId: string): void {
    // Загрузка деталей компании для заполнения формы
  }

  isAccordionOpen = false;

  saveChanges(): void {
    this.currentUserData = {
      ...this.currentUserData,
      firstName: this.formData.firstName,
      lastName: this.formData.lastName,
      middleName: this.formData.middleName,
      email: this.formData.email,
      phoneNumber: this.formData.phone
    };
    this.isEditing = false;
    this.isAccordionOpen = false;
    this.onFormChange();
  }

  toggleAccordion(): void {
    this.isAccordionOpen = !this.isAccordionOpen;
  }

  removeCompany(index: number): void {
    if (this.companies.length > 1) {
      this.companies.splice(index, 1);
      this.onFormChange();
    } else {
      console.log('Нельзя удалить последнюю компанию');
    }
  }

  // Добавьте в класс компонента
  showProductsList = false;

  // Добавьте метод
  toggleProductsList() {
    this.showProductsList = !this.showProductsList;
  }

  /**
   * Проверяет наличие всех товаров в выбранном магазине
   */
  private checkAvailabilityInSelectedStore(): void {
    console.log('checkAvailabilityInSelectedStore called');
    console.log('selectedStoreId:', this.selectedStoreId);
    console.log('orderProducts:', this.orderProducts);
    console.log('allStores:', this.allStores);

    if (!this.selectedStoreId || !this.orderProducts || this.orderProducts.length === 0 || !this.allStores || this.allStores.length === 0) {
      console.log('Conditions not met for checking availability');
      this.availabilityCheck = null;
      return;
    }

    // Находим выбранный магазин
    const selectedStore = this.allStores.find(store => store.id === this.selectedStoreId);
    console.log('selectedStore:', selectedStore);

    if (!selectedStore) {
      console.log('Selected store not found');
      this.availabilityCheck = null;
      return;
    }

    const availableProducts: any[] = [];
    const unavailableProducts: any[] = [];

    // Проверяем каждый товар в корзине
    this.orderProducts.forEach(product => {
      console.log('Checking product:', product.name, 'remains:', product.remains);

      // Ищем остатки этого товара в выбранном магазине
      const productRemain = product.remains?.find((remain: any) =>
        remain.productPlaceId === this.selectedStoreId
      );

      console.log('productRemain for store:', productRemain);

      const availableQty = productRemain?.count || 0;
      const requiredQty = product.qty || 1;
      const isAvailable = availableQty >= requiredQty;

      const availabilityInfo = {
        productId: product.id,
        productName: product.name,
        requiredQty: requiredQty,
        availableQty: availableQty,
        isAvailable: isAvailable,
        storeId: this.selectedStoreId,
        storeName: selectedStore.fullName || selectedStore.name || 'Выбранный магазин'
      };

      if (isAvailable) {
        availableProducts.push(availabilityInfo);
      } else {
        unavailableProducts.push(availabilityInfo);
      }
    });

    console.log('availableProducts:', availableProducts);
    console.log('unavailableProducts:', unavailableProducts);

    // Находим альтернативные магазины в том же городе
    const alternativeStores = this.findAlternativeStores(selectedStore.address?.city);
    console.log('alternativeStores:', alternativeStores);

    // Формируем результат проверки
    this.availabilityCheck = {
      allAvailable: unavailableProducts.length === 0,
      availableProducts: availableProducts,
      unavailableProducts: unavailableProducts,
      alternativeStores: alternativeStores,
      bestAlternativeStore: alternativeStores.length > 0 ? alternativeStores[0] : null
    };

    console.log('availabilityCheck result:', this.availabilityCheck);
  }
  /**
   * Находит альтернативные магазины в том же городе с максимальным наличием товаров
   */
  private findAlternativeStores(city: string): Array<{
    storeId: string;
    storeName: string;
    storeAddress: string;
    availableCount: number;
    totalProducts: number;
    products: ProductAvailability[];
  }> {
    if (!city || !this.allStores || this.allStores.length === 0 || !this.orderProducts) {
      return [];
    }

    // Фильтруем магазины в том же городе, исключая текущий выбранный
    const storesInCity = this.allStores.filter(store =>
      store.address?.city === city && store.id !== this.selectedStoreId
    );

    if (storesInCity.length === 0) {
      return [];
    }

    const alternatives: Array<{
      storeId: string;
      storeName: string;
      storeAddress: string;
      availableCount: number;
      totalProducts: number;
      products: ProductAvailability[];
    }> = [];

    // Для каждого магазина проверяем наличие товаров
    storesInCity.forEach(store => {
      let availableCount = 0;
      const productsInStore: ProductAvailability[] = [];

      this.orderProducts.forEach(product => {
        const productRemain = product.remains?.find((remain: any) =>
          remain.productPlaceId === store.id
        );

        const availableQty = productRemain?.count || 0;
        const requiredQty = product.qty || 1;
        const isAvailable = availableQty >= requiredQty;

        if (isAvailable) {
          availableCount++;
        }

        productsInStore.push({
          productId: product.id,
          productName: product.name,
          requiredQty: requiredQty,
          availableQty: availableQty,
          isAvailable: isAvailable,
          storeId: store.id,
          storeName: store.fullName || store.name || 'Магазин'
        });
      });

      alternatives.push({
        storeId: store.id,
        storeName: store.fullName || store.name || 'Магазин',
        storeAddress: store.fullName || '',
        availableCount: availableCount,
        totalProducts: this.orderProducts.length,
        products: productsInStore
      });
    });

    // Сортируем по количеству доступных товаров (от большего к меньшему)
    return alternatives.sort((a, b) => b.availableCount - a.availableCount);
  }

  /**
   * Переключает выбор на альтернативный магазин
   */
  selectAlternativeStore(storeId: string): void {
    const store = this.allStores.find(s => s.id === storeId);
    if (store) {
      this.selectedStoreId = storeId;
      this.checkAvailabilityInSelectedStore();

      // Эмитируем событие выбора нового магазина
      this.orderDelivery.emit({
        'type': 'pickup',
        'id': storeId,
        'shopCity': store.address?.city,
        'shopAddress': store.fullName
      });

      this.orderDeliveryData = {
        'type': 'pickup',
        'id': storeId
      };

      this.onFormChange();
    }
  }
}