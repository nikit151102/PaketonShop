import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent {
  notifications = [
    { type: 'order', text: 'Новый заказ №12345', time: '10 мин назад' },
    { type: 'message', text: 'У вас новое сообщение', time: '1 час назад' },
    { type: 'sale', text: 'Скидка 20% на ваш любимый товар!', time: 'Вчера' }
  ];

  searchQuery: string = '';
  filter: string = 'all';

  get filteredNotifications() {
    return this.notifications.filter(n => {
      const matchesFilter = this.filter === 'all' || n.type === this.filter;
      const matchesSearch = n.text.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }

  openNotification(notification: any) {
    console.log('Открыть уведомление:', notification);
  }
}