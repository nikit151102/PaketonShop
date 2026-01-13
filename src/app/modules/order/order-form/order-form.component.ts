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

interface Company {
  id: number;
  name: string;
  inn: string;
}

@Component({
  selector: 'app-order-form',
  imports: [CommonModule, FormsModule, PickupDeliveryComponent, TransportDeliveryComponent, CityDeliveryComponent, CompanySelectorComponent],
  templateUrl: './order-form.component.html',
  styleUrl: './order-form.component.scss',
})
export class OrderFormComponent implements OnInit {
  @Input() userBasketId: string | null = '';
  @Output() orderCreated = new EventEmitter<any>();
  @Output() orderUpdated = new EventEmitter<any>();
  @Output() orderDelivery = new EventEmitter<any>();
  @Output() orderCompany = new EventEmitter<any>();
  @Output() formChanged = new EventEmitter<any>();
  
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
  };

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


  orderDeliveryData:any;

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
    console.log('data',data)
    this.orderDelivery.emit({
      'type': type,
      'id': data.id
    });
    this.orderDeliveryData = {
      'type': type,
      'id': data.id
    }
    this.onFormChange();
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
}