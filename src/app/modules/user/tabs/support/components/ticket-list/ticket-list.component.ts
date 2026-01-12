import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketItemComponent } from '../ticket-item/ticket-item.component';

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
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TicketItemComponent],
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.scss']
})
export class TicketListComponent {
  @Input() tickets: Ticket[] = [];
  @Input() selectedTicketId: string | null = null;
  @Output() ticketSelected = new EventEmitter<Ticket>();
  
  filterStatus: string = 'all';
  searchQuery: string = '';

  get filteredTickets(): Ticket[] {
    return this.tickets.filter(ticket => {
      const matchesStatus = this.filterStatus === 'all' || ticket.status === this.filterStatus;
      const matchesSearch = !this.searchQuery || 
        ticket.subject.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        ticket.category.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }

  getStatusCount(status: string): number {
    if (status === 'all') return this.tickets.length;
    return this.tickets.filter(t => t.status === status).length;
  }

  getStatusLabel(status: string): string {
    const labels: {[key: string]: string} = {
      'all': 'Все',
      'new': 'Новые',
      'in_progress': 'В работе',
      'waiting_user': 'Ожидаю вашего ответа',
      'waiting_support': 'Ожидаю ответа поддержки',
      'closed': 'Закрытые',
      'closed_by_client': 'Закрыто клиентом'
    };
    return labels[status] || status;
  }

  selectTicket(ticket: Ticket): void {
    this.ticketSelected.emit(ticket);
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Сегодня';
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays < 7) {
      return `${diffDays} дня назад`;
    }
    
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  }
}