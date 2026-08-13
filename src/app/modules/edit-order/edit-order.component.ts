import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, finalize, forkJoin, of } from 'rxjs';

// Сервисы
import { DeliveryOrderService } from '../../core/api/delivery-order.service';
import { BasketsService } from '../../core/api/baskets.service';

// 🔹 Интерфейсы
export interface OrderProductItem {
  id: string;
  count: number;
  price?: number;
  totalCost: number;
  product?: {
    id: string;
    fullName: string;
    retailPrice: number;
    barcode?: string;
    imageUrl?: string;
    productImageLinks?: string[];
  };
}

@Component({
  selector: 'app-edit-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-order.component.html',
  styleUrls: ['./edit-order.component.scss']
})
export class EditOrderComponent implements OnInit, OnDestroy {
  orderId: string | null = null;
  orderProducts: OrderProductItem[] = [];
  orderTotal: number = 0;
  orderNumber: string | null = null;

  isLoading = false;
  isProcessing = false;
  error: string | null = null;

  // 🔹 Отслеживание изменений
  hasUnsavedChanges = false;
  private originalProducts: OrderProductItem[] = [];

  // 🔹 Карта изменённых товаров: id → { старое_кол-во, новое_кол-во }
  public changedProducts = new Map<string, { oldCount: number; newCount: number }>();
  // 🔹 Множество удалённых товаров
  public removedProductIds = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private deliveryOrderService: DeliveryOrderService,
    private basketsService: BasketsService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.orderId = params.get('id');
      if (this.orderId) {
        this.loadOrderData();
      } else {
        this.error = 'ID заказа не указан в URL';
        this.router.navigate(['/orders']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🔹 Предупреждение при закрытии вкладки
  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      event.returnValue = 'У вас есть несохранённые изменения. Вы уверены, что хотите покинуть страницу?';
    }
  }

  /**
   * Загружаем данные заказа
   */
  public loadOrderData(): void {
    if (!this.orderId) return;

    this.isLoading = true;
    this.error = null;

    this.deliveryOrderService.getOrderById(this.orderId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (order: any) => {
          this.orderNumber = order.data?.orderNumber || null;
          this.orderProducts = order.data?.productPositions || [];

          // 🔹 Сохраняем исходное состояние для сравнения
          this.saveOriginalState();
        },
        error: () => {
          this.error = 'Не удалось загрузить данные заказа';
        }
      });
  }

  /**
   * Сохраняем исходное состояние товаров и очищаем трекинг изменений
   */
  private saveOriginalState(): void {
    this.originalProducts = JSON.parse(JSON.stringify(this.orderProducts));
    this.changedProducts.clear();
    this.removedProductIds.clear();
    this.hasUnsavedChanges = false;
    this.recalculateTotal();
  }

  /**
   * Проверяет, есть ли изменения
   */
  private checkForChanges(): boolean {
    return this.changedProducts.size > 0 || this.removedProductIds.size > 0;
  }

  /**
   * Возвращает сводку изменений для поп-апа
   */
  getUnsavedChangesSummary(): {
    changed: Array<{ name: string; oldQty: number; newQty: number }>,
    removed: string[]
  } {
    const changed: Array<{ name: string; oldQty: number; newQty: number }> = [];
    const removed: string[] = [];

    // Удалённые товары
    for (const id of this.removedProductIds) {
      const orig = this.originalProducts.find(p => p.id === id);
      if (orig) {
        removed.push(orig.product?.fullName || 'Товар');
      }
    }

    // Изменённые товары
    for (const [id, change] of this.changedProducts) {
      const product = this.orderProducts.find(p => p.id === id);
      if (product) {
        changed.push({
          name: product.product?.fullName || 'Товар',
          oldQty: change.oldCount,
          newQty: change.newCount
        });
      }
    }

    return { changed, removed };
  }

  /**
   * Изменение количества товара (локально, без API)
   */
  onQuantityChange(product: OrderProductItem, newQuantity: number): void {
    if (newQuantity < 1) return;

    const oldCount = product.count;
    product.count = newQuantity;

    // 🔹 Трекаем изменение — используем newCount: newQuantity
    if (oldCount !== newQuantity) {
      this.changedProducts.set(product.id, {
        oldCount,
        newCount: newQuantity  // ✅ Явно указываем ключ: значение
      });
    } else {
      this.changedProducts.delete(product.id);
    }

    // Если товар был в списке удалённых — убираем (восстановили)
    this.removedProductIds.delete(product.id);

    this.hasUnsavedChanges = this.checkForChanges();
    this.recalculateTotal();
  }

  /**
   * Удаление товара (локально, без API)
   */
  onRemoveProduct(productId: string): void {
    if (confirm('Удалить этот товар из заказа?')) {
      // 🔹 Сохраняем информацию об удалении для возможного отката
      const removedProduct = this.orderProducts.find(p => p.id === productId);

      this.orderProducts = this.orderProducts.filter(p => p.id !== productId);

      // 🔹 Трекаем удаление
      this.removedProductIds.add(productId);
      // Убираем из изменённых, если было
      this.changedProducts.delete(productId);

      this.hasUnsavedChanges = this.checkForChanges();
      this.recalculateTotal();
    }
  }

  /**
   * Пересчет итоговой суммы
   */
  private recalculateTotal(): void {
    this.orderTotal = this.orderProducts.reduce((sum, p) => {
      const price = p.product?.retailPrice ?? p.price ?? 0;
      return sum + (price * (p.count ?? 1));
    }, 0);
  }

  canProceed(): boolean {
    return this.orderProducts.length > 0 && !this.isLoading && !this.isProcessing;
  }

  /**
   * Фиксация изменений на сервере — отправка индивидуальных запросов
   */
  proceedToCheckout(): void {
    if (!this.canProceed() || !this.orderId) return;

    this.isProcessing = true;
    this.error = null;

    // 🔹 Собираем массив Observable для всех изменений
    const requests: Array<ReturnType<typeof this.basketsService.changeProductPositionFromBasket>> = [];

    // 1. Обновления количества
    for (const [productId, change] of this.changedProducts) {
      requests.push(
        this.basketsService.changeProductPositionFromBasket(productId, change.newCount)
      );
    }

    // 2. Удаления (count = 0)
    for (const productId of this.removedProductIds) {
      requests.push(
        this.basketsService.changeProductPositionFromBasket(productId, 0)
      );
    }

    // 🔹 Если нет запросов — просто переходим
    if (requests.length === 0) {
      this.isProcessing = false;
      this.router.navigate(['/order', this.orderId]);
      return;
    }

    // 🔹 Выполняем все запросы параллельно
    forkJoin(requests)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isProcessing = false)
      )
      .subscribe({
        next: (responses) => {
          // 🔹 После успеха: обновляем локальное состояние и очищаем трекинг
          this.saveOriginalState();
          this.router.navigate(['/order', this.orderId]);
        },
        error: (err) => {
          this.error = 'Не удалось сохранить изменения. Попробуйте позже.';
          // 🔹 При ошибке НЕ очищаем трекинг — пользователь может повторить
        }
      });
  }

  /**
   * Отмена изменений (восстановление оригинала)
   */
  cancelChanges(): void {
    if (this.hasUnsavedChanges && !confirm('Отменить все изменения?')) return;

    this.orderProducts = JSON.parse(JSON.stringify(this.originalProducts));
    this.changedProducts.clear();
    this.removedProductIds.clear();
    this.hasUnsavedChanges = false;
    this.recalculateTotal();
  }

  // 🔹 Вспомогательные методы
  getProductPrice(product: OrderProductItem): number {
    return product.product?.retailPrice ?? product.price ?? 0;
  }

  getProductTotal(product: OrderProductItem): number {
    return product.totalCost;
  }

  trackByProduct(index: number, product: OrderProductItem): string {
    return product.id;
  }

  goBack(): void {
    if (this.hasUnsavedChanges) {
      const changes = this.getUnsavedChangesSummary();
      let message = '⚠️ У вас есть несохранённые изменения:\n\n';

      if (changes.removed.length) message += `🗑️ Удалено: ${changes.removed.length}\n`;
      if (changes.changed.length) message += `📝 Изменено: ${changes.changed.length}\n`;

      message += '\nВыйти без сохранения?';

      if (!confirm(message)) return;
    }
    this.router.navigate(['/orders']);
  }
}