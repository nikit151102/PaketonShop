import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Order {
  id: number;
  date: string;
  amount: number;
  itemsCount: number;
  status: 'Выполнен' | 'В обработке' | 'Отменен';
  payment: string;
  delivery: string;
}


@Component({
  selector: 'app-order-history',
  imports: [CommonModule, FormsModule],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss'
})
export class OrderHistoryComponent {
  orders: Order[] = [
    {
      id: 10123,
      date: '2025-07-12',
      amount: 12490,
      itemsCount: 3,
      status: 'Выполнен',
      payment: 'Картой онлайн',
      delivery: 'Курьер'
    },
    {
      id: 10124,
      date: '2025-08-01',
      amount: 6890,
      itemsCount: 2,
      status: 'В обработке',
      payment: 'При получении',
      delivery: 'Самовывоз'
    },
    {
      id: 10125,
      date: '2025-08-10',
      amount: 9400,
      itemsCount: 4,
      status: 'Отменен',
      payment: 'Картой онлайн',
      delivery: 'Курьер'
    }
  ];
}
