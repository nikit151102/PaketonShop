import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryOrderService } from '../../../../core/api/delivery-order.service';
import { Subject, takeUntil, finalize } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { OrderStatusService } from '../../../../core/services/order-status.service';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { TitleComponent } from '../../../../core/components/title/title.component';

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

  statusText: string;
  statusColor: string;
  statusIcon: string;
  isExpanded: boolean;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,
    TitleComponent,
    EmptyStateComponent],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss',
})
export class OrderHistoryComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  loading = false;
  loadingMore = false;
  error: string | null = null;

  // Пагинация для бесконечного скролла
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  hasMore = true;
  private scrollThreshold = 200; // Порог срабатывания в пикселях

  private destroy$ = new Subject<void>();

  constructor(
    private deliveryOrderService: DeliveryOrderService,
    private orderStatusService: OrderStatusService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.loadOrders(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Слушаем событие скролла
  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    if (this.loadingMore || !this.hasMore) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight - this.scrollThreshold) {
      this.loadMoreOrders();
    }
  }

  loadOrders(reset: boolean = true): void {
    if (reset) {
      this.orders = [];
      this.currentPage = 0;
      this.hasMore = true;
    }

    this.loading = reset;
    this.error = null;

    this.deliveryOrderService.getOrders(this.currentPage, this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.loadingMore = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response.data && Array.isArray(response.data)) {
            const transformedOrders = this.transformApiData(response.data);
            
            if (reset) {
              this.orders = transformedOrders;
            } else {
              this.orders = [...this.orders, ...transformedOrders];
            }
            
            // Обновляем информацию о пагинации
            this.totalPages = response.pageCount || 1;
            this.hasMore = this.currentPage + 1 < this.totalPages;
          } else {
            this.hasMore = false;
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Ошибка при загрузке заказов';
          console.error('Ошибка загрузки заказов:', err);
          this.hasMore = false;
        }
      });
  }

  loadMoreOrders(): void {
    if (!this.hasMore || this.loadingMore || this.loading) return;
    
    this.loadingMore = true;
    this.currentPage++;
    this.loadOrders(false);
  }

  refreshOrders(): void {
    this.loadOrders(true);
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

  toggleOrderExpansion(order: Order): void {
    order.isExpanded = !order.isExpanded;
  }

  repeatOrder(order: Order): void {
    this.deliveryOrderService.repeatOrder(order.id).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.orders.unshift(response.data);
        }
      },
      error: (error) => {
        console.error('Ошибка при повторении заказа:', error);
      }
    });
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

  goToCatalog(): void {
    this.router.navigate(['']);
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

  formatAddress(address: any): string {
    if (!address) return 'Не указан';
    const parts = [];
    if (address.city) parts.push(`г. ${address.city}`);
    if (address.street) parts.push(`ул. ${address.street}`);
    if (address.house) parts.push(`д. ${address.house}`);
    return parts.join(', ') || 'Не указан';
  }

  getStatusText(status: number): string {
    const statusMap: { [key: number]: string } = {
      0: 'Черновик',
      1: 'Обработка',
      2: 'Подтвержден',
      3: 'В сборке',
      4: 'Передан в доставку',
      8: 'Готов к выдаче',
      9: 'Завершен',
      10: 'Отложен',
      11: 'Отменен пользователем',
      12: 'Отменен администратором',
    };
    return statusMap[status] || 'Неизвестно';
  }

  getStatusClass(status: number): string {
    if (status === 0) return 'draft';
    if (status === 1 || status === 2 || status === 3) return 'processing';
    if (status === 4) return 'delivering';
    if (status === 8) return 'arrived';
    if (status === 9) return 'completed';
    if (status === 10) return 'draft';
    if (status === 11 || status === 12) return 'canceled';
    return 'default';
  }

  getProductWord(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) return 'товар';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'товара';
    return 'товаров';
  }
}