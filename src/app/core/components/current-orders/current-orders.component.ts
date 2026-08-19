import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TitleComponent } from '../title/title.component';
import { Subject, takeUntil, finalize } from 'rxjs';
import { DeliveryOrderService } from '../../api/delivery-order.service';
import { OrderStatusService } from '../../services/order-status.service';


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
  paymentStatusType: number;
  orderNumber?: string;
  address?: Address;
  deliveryType?: DeliveryType;
  partnerInstance?: PartnerInstance;
  productPlace?: ProductPlace;
  productPositions?: ProductPosition[];
  realisationNumber?: string;

  statusText: string;
  statusColor: string;
  statusIcon: string;
  isExpanded: boolean;
}


@Component({
  selector: 'app-current-orders',
  imports: [CommonModule, FormsModule, RouterLink, TitleComponent],
  templateUrl: './current-orders.component.html',
  styleUrl: './current-orders.component.scss'
})
export class CurrentOrdersComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  loading = false;
  loadingMore = false;
  error: string | null = null;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  hasMore = true;
  private scrollThreshold = 200;

  private destroy$ = new Subject<void>();

  // 🔹 QR Modal
  showQRModal = false;
  currentOrder: Order | null = null;
  @ViewChild('qrContainer') qrContainer!: ElementRef;

  // 🔹 Состояния для QR
  qrLoading = false;
  qrError = false;
  qrImageUrl: string | null = null; // 🔹 Храним URL картинки

  private pleasantMessages = [
    'Отличный выбор! Ваш заказ уже ждёт вас',
    'Ура! Всё готово к выдаче',
    'Заказ собран с любовью',
    'Вы молодец! Забирайте скорее',
    'Всё упаковано и готово',
    'Ждём вас за покупками!',
    'Заказ идеален, как и вы',
    'Спасибо за доверие!',
    'Готово к встрече с вами!',
    'Ваш заказ — наша гордость'
  ];

  constructor(
    private deliveryOrderService: DeliveryOrderService,
    private orderStatusService: OrderStatusService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.loadOrders(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.body.style.overflow = '';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.loadingMore || !this.hasMore) return;
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentWidth = document.documentElement.scrollWidth;
    if (scrollPosition >= documentWidth - this.scrollThreshold) {
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

    this.deliveryOrderService.getOrders(this.currentPage, this.pageSize, [
      { field: "OrderStatus", values: ["0", "1", "2", "3", "4", "5", "6", "8"], type: 1 }
    ], [{ field: "OrderStatus", sortType: 1 }])
      .pipe(takeUntil(this.destroy$), finalize(() => { this.loading = false; this.loadingMore = false; }))
      .subscribe({
        next: (response: any) => {
          if (response.data && Array.isArray(response.data)) {
            const transformedOrders = this.transformApiData(response.data);
            if (reset) {
              this.orders = transformedOrders;
              // 🔹 Тестовые данные (удалите в продакшене)
              if (this.orders[0]?.orderStatus === 8) {
                this.orders[0].realisationNumber = '233121';
              }
            } else {
              this.orders = [...this.orders, ...transformedOrders];
            }
            this.totalPages = response.pageCount || 1;
            this.hasMore = this.currentPage + 1 < this.totalPages;
          } else {
            this.hasMore = false;
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Ошибка при загрузке заказов';
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
        paymentStatusType: item.paymentStatusType,
        orderNumber: item.orderNumber,
        realisationNumber: item.realisationNumber,
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

  // 🔹 Проверка: можно ли показать QR
  canShowQR(order: Order): boolean {
    return order.orderStatus === 8 && !!order.realisationNumber;
  }

  // 🔹 Открытие модалки с QR
  async openQRModal(order: Order, event: Event): Promise<void> {
    event.stopPropagation();
    this.currentOrder = order;
    this.showQRModal = true;
    this.qrLoading = true;
    this.qrError = false;
    this.qrImageUrl = null;

    // 🔹 Блокировка скролла
    document.body.style.overflow = 'hidden';

    // 🔹 Ждём рендер модалки + генерируем QR
    try {
      await this.generateQRCode(order.realisationNumber!);
    } catch (err) {
      console.error('Ошибка генерации QR:', err);
      this.qrError = true;
      this.qrLoading = false;
    }

    this.cdr.detectChanges();
  }

  closeQRModal(): void {
    this.showQRModal = false;
    this.currentOrder = null;
    this.qrLoading = false;
    this.qrError = false;
    this.qrImageUrl = null;
    document.body.style.overflow = '';
  }

// 🔹 Надёжная генерация QR-кода
private async generateQRCode(data: string): Promise<void> {
  console.log('🔄 generateQRCode вызван, data:', data);
  
  this.qrLoading = true;
  this.qrError = false;
  this.cdr.detectChanges(); // 🔹 Обновляем UI сразу

  // 🔹 Ждём пока элемент появится в DOM
  await new Promise(resolve => setTimeout(resolve, 200));

  const container = this.qrContainer?.nativeElement;
  console.log('📦 container:', container);
  
  if (!container) {
    console.error('❌ container не найден');
    this.qrError = true;
    this.qrLoading = false;
    this.cdr.detectChanges();
    return;
  }

  try {
    // 🔹 Очищаем контейнер от предыдущих элементов
    container.innerHTML = '';
    console.log('🧹 container очищен');

    // 🔹 Создаём QR URL
    const qrData = encodeURIComponent(data);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&color=3c8a27&bgcolor=ffffff&qzone=1&margin=10`;
    console.log('🔗 QR URL:', qrUrl);

    // 🔹 Создаём img элемент
    const img = document.createElement('img');
    img.src = qrUrl;
    img.alt = 'QR-код для получения заказа';
    img.style.width = '200px';
    img.style.height = '200px';
    img.style.borderRadius = '12px';
    img.style.display = 'none'; // 🔹 Скрываем пока не загрузится
    console.log('🖼️ img создан');

    // 🔹 Ждём загрузку изображения
    await new Promise((resolve, reject) => {
      img.onload = () => {
        console.log('✅ img.onload сработал');
        resolve(img);
      };
      img.onerror = (e) => {
        console.error('❌ img.onerror:', e);
        reject(new Error('Failed to load QR image'));
      };
    });

    // 🔹 Показываем изображение и добавляем в DOM
    img.style.display = 'block';
    container.appendChild(img);
    console.log('📎 img добавлен в container');

    this.qrLoading = false;
    this.cdr.detectChanges();
    console.log('✨ QR успешно показан');

  } catch (err) {
    console.error('❌ Ошибка в try-catch:', err);
    this.qrError = true;
    this.qrLoading = false;
    
    // 🔹 Показываем сообщение об ошибке
    if (container) {
      container.innerHTML = `
        <div class="qr-error">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>Не удалось загрузить QR</span>
        </div>
      `;
    }
    this.cdr.detectChanges();
  }
}

  // 🔹 Helper: промис для загрузки изображения
  private loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  }

  copyRealisationNumber(): void {
    if (!this.currentOrder?.realisationNumber) return;
    navigator.clipboard.writeText(this.currentOrder.realisationNumber).then(() => {
      alert('Номер получения скопирован! 📋');
    }).catch(() => {
      alert('Не удалось скопировать 😔');
    });
  }

  downloadQR(): void {
    if (!this.qrImageUrl) return;
    const link = document.createElement('a');
    link.href = this.qrImageUrl;
    link.download = `qr-order-${this.currentOrder?.realisationNumber || this.currentOrder?.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
 * Возвращает первые 5 уникальных изображений из позиций заказа
 */
  getOrderPreviewImages(positions: ProductPosition[]): string[] {
    if (!positions) return [];

    const images: string[] = [];
    for (const pos of positions) {
      if (pos.product?.productImageLinks?.[0] && images.length < 5) {
        images.push(pos.product.productImageLinks[0]);
      }
    }
    return images;
  }


  getPaymentStatusText(status: number): string {
    const map: { [key: number]: string } = { 0: 'Не оплачен', 1: 'Оплачен частично', 2: 'Оплачен полностью', 3: 'Обработка оплаты', 4: 'Ожидание оплаты' };
    return map[status] ?? 'Не оплачен';
  }

  getPaymentStatusClass(status: number): string {
    const map: { [key: number]: string } = { 0: 'payment-not-paid', 1: 'payment-partial', 2: 'payment-paid', 3: 'payment-pending', 4: 'payment-waiting' };
    return map[status] ?? 'payment-not-paid';
  }

  toggleOrderExpansion(order: Order): void { order.isExpanded = !order.isExpanded; }

  repeatOrder(order: Order): void {
    this.deliveryOrderService.repeatOrder(order.id).subscribe({
      next: (res: any) => { if (res?.data) this.orders.unshift(res.data); },
      error: () => { }
    });
  }

  cancelOrder(order: Order): void {
    if (confirm(`Отменить заказ #${this.formatOrderId(order.id)}?`)) {
      this.deliveryOrderService.changeOrderStatus(order.id, 11).subscribe(() => this.loadOrders(true));
    }
  }

  formatOrderId(id: string): string { return id.substring(0, 8).toUpperCase(); }
  goToCatalog(): void { this.router.navigate(['']); }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount);
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
    const map: { [key: number]: string } = { 0: 'Черновик', 1: 'Обработка', 2: 'Подтвержден', 3: 'В сборке', 4: 'Передан в доставку', 8: 'Готов к выдаче', 9: 'Завершен', 10: 'Отложен', 11: 'Отменен пользователем', 12: 'Отменен администратором' };
    return map[status] || 'Неизвестно';
  }

  getStatusClass(status: number): string {
    if (status === 0) return 'draft';
    if (status >= 1 && status <= 3) return 'processing';
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