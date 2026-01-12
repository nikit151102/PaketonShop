import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  selector: 'app-create-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-ticket.component.html',
  styleUrls: ['./create-ticket.component.scss']
})
export class CreateTicketComponent {
  @Output() ticketCreated = new EventEmitter<Ticket>();
  @Output() cancel = new EventEmitter<void>();

  categories = [
    'По товару',
    'По заявке',
    'По оплате',
    'По доставке',
    'По возврату и обмену',
    'По акциям и скидкам',
    'По качеству обслуживания',
    'По работе сайта',
    'По сотрудничеству и партнерству',
    'По личному кабинету',
    'По конфиденциальности и данным'
  ];

  selectedCategory = this.categories[0];
  subject = '';
  message = '';
  isLoading = false;

  // Случайные имена для теста
  getRandomAgent() {
    const agents = [
      { name: 'Анна Петрова', avatar: 'https://i.pravatar.cc/150?img=1' },
      { name: 'Иван Сидоров', avatar: 'https://i.pravatar.cc/150?img=2' },
      { name: 'Мария Иванова', avatar: 'https://i.pravatar.cc/150?img=3' },
      { name: 'Сергей Васильев', avatar: 'https://i.pravatar.cc/150?img=4' }
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  onSubmit() {
    if (!this.subject.trim() || !this.message.trim()) {
      return;
    }

    this.isLoading = true;

    // Имитация задержки отправки
    setTimeout(() => {
      const newTicket: Ticket = {
        id: `ticket_${Date.now()}`,
        subject: this.subject,
        category: this.selectedCategory,
        status: 'new',
        unreadCount: 0,
        lastMessage: this.message,
        lastMessageTime: new Date(),
        agent: this.getRandomAgent()
      };

      this.ticketCreated.emit(newTicket);
      this.resetForm();
      this.isLoading = false;
    }, 1000);
  }

  onCancel() {
    this.cancel.emit();
  }

  resetForm() {
    this.subject = '';
    this.message = '';
    this.selectedCategory = this.categories[0];
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

  onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'Enter') {
      this.onSubmit();
    }
  }
}