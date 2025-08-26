import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

interface CrossSellProduct {
  id: number;
  name: string;
  price: number;
  image: string;
}


@Component({
  selector: 'app-summary',
  imports: [CommonModule],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss'
})
export class SummaryComponent {
  @Input() products: any = [];

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

  crossSellProducts: CrossSellProduct[] = [
    { id: 101, name: 'Скотч упаковочный', price: 50, image: 'https://via.placeholder.com/100' },
    { id: 102, name: 'Пакетик для товаров', price: 15, image: 'https://via.placeholder.com/100' },
    { id: 103, name: 'Маркер для коробок', price: 30, image: 'https://via.placeholder.com/100' }
  ];

  get total() {
    return this.products?.reduce((sum: number, p: any) => sum + (p.price * (p.qty ?? 1)), 0) ?? 0;
  }

}
