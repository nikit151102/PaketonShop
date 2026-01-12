import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateTicketComponent } from './components/create-ticket/create-ticket.component';
import { TicketChatComponent } from './components/ticket-chat/ticket-chat.component';

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
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule, TicketChatComponent, CreateTicketComponent],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {
  showCreateTicket = false;
  selectedTicket: Ticket | null = null;
  
  tickets: Ticket[] = [
    {
      id: '1',
      subject: 'Проблема с оплатой заказа #12345',
      category: 'По оплате',
      status: 'in_progress',
      unreadCount: 2,
      lastMessage: 'Привет! Проверил ваш платеж, все в порядке с нашей стороны',
      lastMessageTime: new Date(Date.now() - 3600000),
      agent: {
        name: 'Анна Петрова',
        avatar: 'https://i.pravatar.cc/150?img=1'
      }
    },
    {
      id: '2',
      subject: 'Задержка доставки',
      category: 'По доставке',
      status: 'waiting_user',
      unreadCount: 0,
      lastMessage: 'Запрос отправлен в транспортную компанию',
      lastMessageTime: new Date(Date.now() - 86400000),
      agent: {
        name: 'Иван Сидоров',
        avatar: 'https://i.pravatar.cc/150?img=2'
      }
    },
    {
      id: '3',
      subject: 'Вопрос по возврату товара',
      category: 'По возврату и обмену',
      status: 'waiting_support',
      unreadCount: 1,
      lastMessage: 'Отправил фото товара для проверки',
      lastMessageTime: new Date(Date.now() - 172800000)
    },
    {
      id: '4',
      subject: 'Проблема с аккаунтом',
      category: 'По личному кабинету',
      status: 'closed',
      unreadCount: 0,
      lastMessage: 'Проблема решена, спасибо за обращение!',
      lastMessageTime: new Date(Date.now() - 259200000),
      agent: {
        name: 'Мария Иванова',
        avatar: 'https://i.pravatar.cc/150?img=3'
      },
      rating: 5
    },
    {
      id: '5',
      subject: 'Не работает кнопка оформления заказа',
      category: 'По работе сайта',
      status: 'new',
      unreadCount: 1,
      lastMessage: 'Кнопка "Купить" не реагирует на клик',
      lastMessageTime: new Date(Date.now() - 7200000)
    },
    {
      id: '6',
      subject: 'Вопрос по акции на технику',
      category: 'По акциям и скидкам',
      status: 'closed_by_client',
      unreadCount: 0,
      lastMessage: 'Спасибо за разъяснения!',
      lastMessageTime: new Date(Date.now() - 604800000),
      agent: {
        name: 'Сергей Васильев',
        avatar: 'https://i.pravatar.cc/150?img=4'
      }
    }
  ];

  ngOnInit(): void {
    // Можно загрузить реальные данные из API
    // this.loadTickets();
  }

  selectTicket(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.showCreateTicket = false;
    // Сбрасываем счетчик непрочитанных
    ticket.unreadCount = 0;
  }

  openCreateTicket(): void {
    this.showCreateTicket = true;
    this.selectedTicket = null;
  }

  goBack(): void {
    this.selectedTicket = null;
    this.showCreateTicket = false;
  }

  handleTicketCreated(newTicket: Ticket): void {
    this.tickets.unshift(newTicket);
    this.selectedTicket = newTicket;
    this.showCreateTicket = false;
  }

  handleTicketUpdated(updatedTicket: Ticket): void {
    const index = this.tickets.findIndex(t => t.id === updatedTicket.id);
    if (index !== -1) {
      this.tickets[index] = updatedTicket;
    }
  }

  getUnreadCount(): number {
    return this.tickets.reduce((sum, ticket) => sum + ticket.unreadCount, 0);
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

  getMessagePreview(message: string): string {
    if (message.length > 100) {
      return message.substring(0, 97) + '...';
    }
    return message;
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) {
      return 'только что';
    } else if (diffHours < 1) {
      return `${diffMinutes} мин. назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч. назад`;
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  }
}