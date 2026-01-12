import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
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

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
  read: boolean;
  attachments?: string[];
}

@Component({
  selector: 'app-ticket-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-chat.component.html',
  styleUrls: ['./ticket-chat.component.scss']
})
export class TicketChatComponent implements OnInit {
  @Input() ticket!: Ticket;
  @Output() ticketUpdated = new EventEmitter<Ticket>();
  
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  newMessage = '';
  isSending = false;
  showRatingModal = false;
  rating = 0;
  hoverRating = 0;

  // Моковые данные для чата
  messages: Message[] = [
    {
      id: '1',
      text: 'Здравствуйте! У меня проблема с оплатой заказа #12345. Не проходит платеж.',
      sender: 'user',
      timestamp: new Date(Date.now() - 86400000),
      read: true
    },
    {
      id: '2',
      text: 'Здравствуйте! Проверил ваш платеж, все в порядке с нашей стороны. Возможно, проблема на стороне банка. Попробуйте использовать другую карту или свяжитесь с вашим банком.',
      sender: 'support',
      timestamp: new Date(Date.now() - 82800000),
      read: true
    },
    {
      id: '3',
      text: 'Спасибо! Попробую с другой карты и отпишусь.',
      sender: 'user',
      timestamp: new Date(Date.now() - 79200000),
      read: true
    },
    {
      id: '4',
      text: 'С другой карты тоже не проходит. Может быть, у вас есть другие способы оплаты?',
      sender: 'user',
      timestamp: new Date(Date.now() - 3600000),
      read: false
    }
  ];

  ngOnInit() {
    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  sendMessage() {
    if (!this.newMessage.trim() || this.isSending) return;

    this.isSending = true;
    
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      text: this.newMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
      read: false
    };

    this.messages.push(newMsg);
    
    // Обновляем тикет
    const updatedTicket = {
      ...this.ticket,
      lastMessage: this.newMessage.trim(),
      lastMessageTime: new Date(),
      status: 'waiting_support' as const,
      unreadCount: 0
    };

    // Имитация задержки отправки
    setTimeout(() => {
      this.newMessage = '';
      this.isSending = false;
      
      // Имитация ответа поддержки
      setTimeout(() => {
        const supportMsg: Message = {
          id: `msg_${Date.now()}_support`,
          text: 'Спасибо за сообщение! Я проверю вашу проблему и отвечу в ближайшее время.',
          sender: 'support',
          timestamp: new Date(),
          read: true
        };
        this.messages.push(supportMsg);
        
        const ticketWithSupport = {
          ...updatedTicket,
          status: 'waiting_user' as const,
          lastMessage: supportMsg.text
        };
        
        this.ticketUpdated.emit(ticketWithSupport);
      }, 2000);
      
      this.ticketUpdated.emit(updatedTicket);
    }, 500);

    this.messageInput.nativeElement.focus();
  }

  closeTicket() {
    if (confirm('Вы уверены, что хотите закрыть обращение?')) {
      const closedTicket = {
        ...this.ticket,
        status: 'closed_by_client' as const
      };
      this.ticketUpdated.emit(closedTicket);
      this.showRatingModal = true;
    }
  }

  submitRating() {
    const ratedTicket = {
      ...this.ticket,
      rating: this.rating,
      status: 'closed' as const
    };
    this.ticketUpdated.emit(ratedTicket);
    this.showRatingModal = false;
    this.rating = 0;
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(date: Date): string {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  }

  shouldShowDate(index: number): boolean {
    if (index === 0) return true;
    
    const currentDate = this.messages[index].timestamp.toDateString();
    const prevDate = this.messages[index - 1].timestamp.toDateString();
    
    return currentDate !== prevDate;
  }

  onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'Enter') {
      this.sendMessage();
    }
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
}