import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Order {
  id: number;
  date: Date;
  amount: number;
  itemsCount: number;
  status: string;
  progress: number; // для прогресс-бара
}

@Component({
  selector: 'app-current-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './current-orders.component.html',
  styleUrl: './current-orders.component.scss'
})
export class CurrentOrdersComponent {

  currentOrders: Order[] = [
    {
      id: 101,
      date: new Date(),
      amount: 3250,
      itemsCount: 3,
      status: 'В обработке',
      progress: 20
    },
    {
      id: 102,
      date: new Date(),
      amount: 1490,
      itemsCount: 1,
      status: 'Готовится',
      progress: 50
    },
    {
      id: 103,
      date: new Date(),
      amount: 5890,
      itemsCount: 5,
      status: 'В пути',
      progress: 80
    }
  ];

  getStep(order: Order): number {
    if (order.progress >= 80) return 2; // "В пути"
    if (order.progress >= 50) return 1; // "Готовится"
    return 0; // "В обработке"
  }


}
