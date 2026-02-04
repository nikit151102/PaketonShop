import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OrderStatusService {

  constructor() { }

  getStatusInfo(status: number | null): { text: string; color: string; icon: string } {

    const statusCode = status === null || status === undefined ? 0 : status;

    const statusMap: Record<number, { text: string; color: string; icon: string }> = {
      0: { text: 'Черновик', color: 'info', icon: '' },
      2: { text: 'Создан', color: 'warning', icon: '' },
      3: { text: 'На сборке', color: 'primary', icon: '' },
      4: { text: 'В пути', color: 'process', icon: '' },
      8: { text: 'Готов к выдаче', color: 'success', icon: '' },
      9: { text: 'Выдан', color: 'success', icon: '' },
      11: { text: 'Отменен', color: 'error', icon: '' }, // Отменен клиентом
      12: { text: 'Отменен', color: 'error', icon: '' } // Отменен менеджером
    };

    return statusMap[statusCode] || { text: 'Неизвестно', color: 'default', icon: '❓' };
  }
}
