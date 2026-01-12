import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  }

  getInitials(): string {
    if (!this.currentUserData) return '?';

    const first = this.currentUserData.firstName?.[0] || '';
    const last = this.currentUserData.lastName?.[0] || '';

    return (first + last).toUpperCase() || 'U';
  }

  selectDelivery(type: string) {
    this.formData.delivery = type;
  }

  onDeliveryDataChange(data: any) {
    // Обновляем данные конкретного типа доставки
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
      // Можно обновить formData.personType если нужно
      this.formData.personType = 'jur';

      // Загрузить детали выбранной компании
      this.loadCompanyDetails(companyId);
    }
  }

  onCompanyAdded(): void {
    console.log('Компания добавлена');
    // Можно показать уведомление
  }

  onCompanyEdited(company: any): void {
    console.log('Компания отредактирована:', company);
  }

  onCompanyDeleted(companyId: string): void {
    console.log('Компания удалена:', companyId);

    // Если удалена выбранная компания
    if (this.selectedCompanyId === companyId) {
      this.selectedCompanyId = null;
      this.formData.personType = 'fiz';
    }
  }

  private loadCompanyDetails(companyId: string): void {
    // Загрузка деталей компании для заполнения формы
    // Можно реализовать если нужно
  }

  onSubmit() {
    if (!this.formData.agreement) return;

    this.isSubmitting = true;

    // Симуляция отправки формы
    setTimeout(() => {
      this.isSubmitting = false;
      console.log('Заказ оформлен:', this.formData);
      // Здесь будет реальная логика отправки
    }, 2000);
  }



  isAccordionOpen = false;

  saveChanges(): void {
    // Сохранение данных
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
  }

  toggleAccordion(): void {
    this.isAccordionOpen = !this.isAccordionOpen;
  }

  removeCompany(index: number): void {
    if (this.companies.length > 1) {
      this.companies.splice(index, 1);
    } else {
      // Можно показать сообщение пользователю, что нельзя удалить последнюю компанию
      console.log('Нельзя удалить последнюю компанию');
      // Или показать toast/snackbar сообщен
    }
  }
}