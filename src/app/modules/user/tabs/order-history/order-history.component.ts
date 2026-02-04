import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryOrderService } from '../../../../core/api/delivery-order.service';
import { Subject, takeUntil, finalize } from 'rxjs';
import { RouterLink } from '@angular/router';
import { OrderStatusService } from '../../../../core/services/order-status.service';

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
  positionCount: number;
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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss',
})
export class OrderHistoryComponent implements OnInit {
  orders: any[] = [];
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
  selectedOrder: any | null = null;

  private destroy$ = new Subject<void>();

  constructor(private deliveryOrderService: DeliveryOrderService,
    private orderStatusService:OrderStatusService
  ) { }

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
        }
      });
  }

  transformApiData(apiData: any[]): Order[] {
    return apiData.map(item => {
      const statusInfo = this.orderStatusService.getStatusInfo(item.orderStatus);

      return {
        id: item.id,
        orderDateTime: item.orderDateTime,
        orderStatus: item.orderStatus,
        positionCount: item.positionCount,
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

}