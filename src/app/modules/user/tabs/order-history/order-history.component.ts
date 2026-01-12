import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryOrderService } from '../../../../core/api/delivery-order.service';
import { Subject, takeUntil, finalize } from 'rxjs';

// Интерфейсы
interface ProductPosition {
  id: string;
  product?: Product;
  count: number;
  price: number;
  priceSale: number;
  totalCost: number;
}

interface Product {
  id: string;
  shortName: string;
  fullName: string;
  article: string;
  manufacturer: string;
  productImageLinks: string[];
  retailPrice: number;
  retailPriceDest: number;
  measurementUnit: {
    shortName: string;
  };
}

interface Address {
  id: string;
  region: string;
  area: string;
  city: string;
  street: string;
  house: string;
  postIndex: string;
}

interface DeliveryType {
  shortName: string;
  fullName: string;
}

interface PartnerInstance {
  partner: {
    shortName: string;
    fullName: string;
  };
}

interface ProductPlace {
  shortName: string;
  fullName: string;
  advantageList: string[];
}

interface Order {
  id: string;
  orderDateTime: string;
  orderStatus: number;
  productCount: number;
  totalCost: number;
  deliveryCost: number;
  orderCost: number;
  consultation: boolean;
  
  address?: Address;
  deliveryType?: DeliveryType;
  partnerInstance?: PartnerInstance;
  productPlace?: ProductPlace;
  productPositions?: ProductPosition[];
  
  // Дополнительные поля для UI
  statusText: string;
  statusColor: string;
  statusIcon: string;
  isExpanded: boolean;
}

// Удалите старый ApiResponse и используйте этот
interface ApiResponse {
  message: string;
  status: number;
  pageCount: number;
  page: number;
  pageSize: number;
  data: any[];
  breadCrumbs: string[];
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss',
})
export class OrderHistoryComponent implements OnInit {
  orders: Order[] = [];
  loading = false;
  error: string | null = null;
  
  // Пагинация
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalOrders = 0;
  
  // Фильтры
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'completed' | 'cancelled' = 'all';
  dateFilter: 'all' | 'week' | 'month' | 'quarter' = 'all';
  
  // Сортировка
  sortBy: 'date' | 'amount' | 'status' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Состояния
  showFilters = false;
  selectedOrder: Order | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(private deliveryOrderService: DeliveryOrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = null;

    this.deliveryOrderService.getOrders(this.currentPage, this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response: any) => {
          if (response.data && Array.isArray(response.data)) {
            this.orders = this.transformApiData(response.data);
            this.totalPages = response.pageCount || 1;
            this.totalOrders = (response.pageSize || 10) * (response.pageCount || 1);
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Ошибка при загрузке заказов';
          console.error('Ошибка загрузки заказов:', err);
          
          // Для демонстрации - временные данные
          this.orders = this.getMockOrders();
        }
      });
  }

  transformApiData(apiData: any[]): Order[] {
    return apiData.map(item => {
      const statusInfo = this.getStatusInfo(item.orderStatus);
      
      return {
        id: item.id,
        orderDateTime: item.orderDateTime,
        orderStatus: item.orderStatus,
        productCount: item.productCount,
        totalCost: item.totalCost,
        deliveryCost: item.deliveryCost,
        orderCost: item.orderCost,
        consultation: item.consultation,
        
        address: item.address,
        deliveryType: item.deliveryType,
        partnerInstance: item.partnerInstance,
        productPlace: item.productPlace,
        productPositions: item.productPositions || [],
        
        statusText: statusInfo.text,
        statusColor: statusInfo.color,
        statusIcon: statusInfo.icon,
        isExpanded: false
      };
    });
  }

  getStatusInfo(status: number): { text: string; color: string; icon: string } {
    const statusMap: Record<number, { text: string; color: string; icon: string }> = {
      0: { text: 'Новый', color: 'info', icon: '⏳' },
      1: { text: 'В обработке', color: 'warning', icon: '🔄' },
      2: { text: 'Подтвержден', color: 'primary', icon: '✅' },
      3: { text: 'Доставляется', color: 'process', icon: '🚚' },
      4: { text: 'Выполнен', color: 'success', icon: '🎉' },
      5: { text: 'Отменен', color: 'error', icon: '❌' }
    };
    
    return statusMap[status] || { text: 'Неизвестно', color: 'default', icon: '❓' };
  }

  getFilteredOrders(): Order[] {
    let filtered = [...this.orders];

    // Поиск
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(term) ||
        (order.deliveryType?.shortName?.toLowerCase() || '').includes(term) ||
        (order.partnerInstance?.partner?.shortName?.toLowerCase() || '').includes(term)
      );
    }

    // Фильтр по статусу
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(order => {
        switch (this.statusFilter) {
          case 'active':
            return [0, 1, 2, 3].includes(order.orderStatus);
          case 'completed':
            return order.orderStatus === 4;
          case 'cancelled':
            return order.orderStatus === 5;
          default:
            return true;
        }
      });
    }

    // Фильтр по дате
    if (this.dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDateTime);
        const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24));
        
        switch (this.dateFilter) {
          case 'week': return diffDays <= 7;
          case 'month': return diffDays <= 30;
          case 'quarter': return diffDays <= 90;
          default: return true;
        }
      });
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (this.sortBy) {
        case 'date':
          aVal = new Date(a.orderDateTime).getTime();
          bVal = new Date(b.orderDateTime).getTime();
          break;
        case 'amount':
          aVal = a.totalCost;
          bVal = b.totalCost;
          break;
        case 'status':
          aVal = a.orderStatus;
          bVal = b.orderStatus;
          break;
      }
      
      return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }

  toggleOrderExpansion(order: Order): void {
    order.isExpanded = !order.isExpanded;
  }

  selectOrder(order: Order): void {
    this.selectedOrder = order;
  }

  closeOrderDetail(): void {
    this.selectedOrder = null;
  }

  repeatOrder(order: Order): void {
    console.log('Повторить заказ:', order.id);
    // Здесь будет логика повторения заказа
  }

  downloadInvoice(order: Order): void {
    console.log('Скачать счет для заказа:', order.id);
    // Здесь будет логика скачивания счета
  }

  cancelOrder(order: Order): void {
    if (confirm(`Вы уверены, что хотите отменить заказ #${this.formatOrderId(order.id)}?`)) {
      console.log('Отменить заказ:', order.id);
      // Здесь будет логика отмены заказа
    }
  }

  formatOrderId(id: string): string {
    return id.substring(0, 8).toUpperCase();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount);
  }

  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadOrders();
    }
  }

  // Метод для получения номеров страниц для пагинации
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.dateFilter = 'all';
    this.sortBy = 'date';
    this.sortDirection = 'desc';
  }

  getTotalSum(): number {
    return this.getFilteredOrders().reduce((sum, order) => sum + order.totalCost, 0);
  }

  getAverageOrderValue(): number {
    const filtered = this.getFilteredOrders();
    return filtered.length > 0 ? Math.round(this.getTotalSum() / filtered.length) : 0;
  }

  // Вспомогательные методы для статистики
  getCompletedOrdersCount(): number {
    return this.getFilteredOrders().filter(order => order.orderStatus === 4).length;
  }

  getActiveOrdersCount(): number {
    return this.getFilteredOrders().filter(order => [0, 1, 2, 3].includes(order.orderStatus)).length;
  }

  // Временные данные для демонстрации
  private getMockOrders(): Order[] {
    return [
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        orderDateTime: '2025-07-12T14:30:00.000Z',
        orderStatus: 4,
        productCount: 3,
        totalCost: 12490,
        deliveryCost: 500,
        orderCost: 11990,
        consultation: true,
        address: {
          id: '1',
          region: 'Московская область',
          area: '',
          city: 'Москва',
          street: 'Ленина',
          house: '42',
          postIndex: '123456'
        },
        deliveryType: { shortName: 'Курьер', fullName: 'Доставка курьером' },
        partnerInstance: { partner: { shortName: 'ООО Ромашка', fullName: 'Общество с ограниченной ответственностью "Ромашка"' } },
        productPlace: { shortName: 'Склад 1', fullName: 'Основной склад', advantageList: ['Быстрая выдача', 'Наличие'] },
        productPositions: [
          {
            id: '1',
            product: {
              id: '1',
              shortName: 'Ноутбук ASUS',
              fullName: 'Ноутбук ASUS VivoBook 15',
              article: 'ASUS001',
              manufacturer: 'ASUS',
              productImageLinks: ['/assets/products/laptop.jpg'],
              retailPrice: 45990,
              retailPriceDest: 42990,
              measurementUnit: { shortName: 'шт' }
            },
            count: 1,
            price: 42990,
            priceSale: 39990,
            totalCost: 39990
          }
        ],
        statusText: 'Выполнен',
        statusColor: 'success',
        statusIcon: '🎉',
        isExpanded: false
      },
      {
        id: '4fa85f64-5717-4562-b3fc-2c963f66afa7',
        orderDateTime: '2025-08-01T10:15:00.000Z',
        orderStatus: 2,
        productCount: 2,
        totalCost: 6890,
        deliveryCost: 0,
        orderCost: 6890,
        consultation: false,
        address: {
          id: '2',
          region: 'Ленинградская область',
          area: '',
          city: 'Санкт-Петербург',
          street: 'Невский проспект',
          house: '28',
          postIndex: '190000'
        },
        deliveryType: { shortName: 'Самовывоз', fullName: 'Самовывоз со склада' },
        partnerInstance: { partner: { shortName: 'ИП Иванов', fullName: 'Индивидуальный предприниматель Иванов И.И.' } },
        productPlace: { shortName: 'ПВЗ', fullName: 'Пункт выдачи заказов', advantageList: ['Удобное расположение', 'До 22:00'] },
        productPositions: [],
        statusText: 'Подтвержден',
        statusColor: 'primary',
        statusIcon: '✅',
        isExpanded: false
      },
      {
        id: '5fa85f64-5717-4562-b3fc-2c963f66afa8',
        orderDateTime: '2025-08-10T16:45:00.000Z',
        orderStatus: 5,
        productCount: 4,
        totalCost: 9400,
        deliveryCost: 300,
        orderCost: 9100,
        consultation: true,
        address: {
          id: '3',
          region: 'Свердловская область',
          area: '',
          city: 'Екатеринбург',
          street: 'Мира',
          house: '15',
          postIndex: '620000'
        },
        deliveryType: { shortName: 'Почта', fullName: 'Доставка почтой России' },
        partnerInstance: { partner: { shortName: 'ООО Техно', fullName: 'Общество с ограниченной ответственностью "Техно"' } },
        productPlace: { shortName: 'Склад 2', fullName: 'Дополнительный склад', advantageList: ['Низкие цены', 'Большой выбор'] },
        productPositions: [],
        statusText: 'Отменен',
        statusColor: 'error',
        statusIcon: '❌',
        isExpanded: false
      }
    ];
  }
}