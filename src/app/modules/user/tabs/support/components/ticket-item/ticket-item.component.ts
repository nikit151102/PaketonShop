import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: 'new' | 'in_progress' | 'waiting_user' | 'waiting_support' | 'closed' | 'closed_by_client';
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: Date;
  agent?: {
    name: string;
    avatar: string;
  };
  rating?: number;
}

@Component({
  selector: 'app-ticket-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-item.component.html',
  styleUrls: ['./ticket-item.component.scss']
})
export class TicketItemComponent {
  @Input() ticket!: Ticket;
  @Input() isSelected = false;

  getStatusColor(status: string): string {
    const colors: {[key: string]: string} = {
      'new': '#10b981',
      'in_progress': '#3b82f6',
      'waiting_user': '#f59e0b',
      'waiting_support': '#8b5cf6',
      'closed': '#9ca3af',
      'closed_by_client': '#6b7280'
    };
    return colors[status] || '#9ca3af';
  }

  getStatusText(status: string): string {
    const texts: {[key: string]: string} = {
      'new': 'Новое',
      'in_progress': 'В работе',
      'waiting_user': 'Ожидаю вашего ответа',
      'waiting_support': 'Ожидаю ответа поддержки',
      'closed': 'Закрыто',
      'closed_by_client': 'Закрыто клиентом'
    };
    return texts[status] || status;
  }

  getCategoryIcon(category: string): string {
    const icons: {[key: string]: string} = {
      'По товару': '🛒',
      'По заявке': '📝',
      'По оплате': '💳',
      'По доставке': '🚚',
      'По возврату и обмену': '🔄',
      'По акциям и скидкам': '🎁',
      'По качеству обслуживания': '⭐',
      'По работе сайта': '💻',
      'По сотрудничеству и партнерству': '🤝',
      'По личному кабинету': '👤',
      'По конфиденциальности и данным': '🔒'
    };
    return icons[category] || '📋';
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return `${diffMins} мин`;
    } else if (diffHours < 24) {
      return `${diffHours} ч`;
    } else if (diffDays < 7) {
      return `${diffDays} д`;
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  }

  getLastMessagePreview(message: string): string {
    if (message.length > 60) {
      return message.substring(0, 57) + '...';
    }
    return message;
  }
}