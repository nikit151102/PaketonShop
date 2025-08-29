import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Company {
  id: number;
  name: string;
  inn: string;
}

@Component({
  selector: 'app-order-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './order-form.component.html',
  styleUrl: './order-form.component.scss'
})
export class OrderFormComponent {
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
    delivery: 'pickup'
  };

  companies: Company[] = [
    { id: 1, name: 'ООО "Пример"', inn: '0000000000' },
    { id: 2, name: 'ООО "Логистика"', inn: '0000000000' }
  ];


  // Методы управления корзиной
  addCompany() {
    this.companies.push({ id: Date.now(), name: 'Новая компания', inn: '00000000000' });
  }


}
