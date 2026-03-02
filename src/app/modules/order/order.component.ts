import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrderFormComponent } from './order-form/order-form.component';
import { BasketsService } from '../../core/api/baskets.service';
import { DeliveryOrderService } from '../../core/api/delivery-order.service';
import { Subject, takeUntil, interval } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { PluralPipe } from "../../core/pipes/plural.pipe";
import { PaymentService } from '../../core/api/payment.service';
import { PaymentWidgetComponent } from '../../core/components/payment-widget/payment-widget.component';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    OrderFormComponent,
    FormsModule,
    PluralPipe,
    PaymentWidgetComponent
  ],
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss']
})
export class OrderComponent implements OnInit, OnDestroy {
  activeBasketId: string | null = null;
  basketProducts: any[] = [];
  createdOrderId: string | null = null;
  discount: number = 0;
  deliveryCost: number = 0;
  showSuccessNotification = false;
  isLoading = false;
  isSaving = false;
  isProcessing = false;
  savingProgress = 0;
  currentDate = new Date();

  // Новая переменная для способа оплаты
  paymentMethod: 'online' | 'cash' | 'card' = 'online';

  // Пример скидок (можно получать с бекенда)
  discountRules = [
    { minAmount: 10000, discountPercent: 5 },
    { minAmount: 20000, discountPercent: 10 },
    { minAmount: 50000, discountPercent: 15 }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private basketsService: BasketsService,
    private deliveryOrderService: DeliveryOrderService,
    private paymentService: PaymentService
  ) { }

  ngOnInit(): void {
    this.updateCurrentTime();

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.activeBasketId = params['id'];
        if (this.activeBasketId) {
          this.loadBasketProducts();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateCurrentTime(): void {
    interval(60000) // Обновлять каждую минуту
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentDate = new Date();
      });
  }

  loadBasketProducts(): void {
    if (!this.activeBasketId) return;

    this.isLoading = true;
    this.deliveryOrderService.getOrderById(this.activeBasketId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.data?.productPositions) {
            this.basketProducts = response.data.productPositions.map((p: any) => ({
              id: p.product.id,
              name: p.product.name || p.product.fullName || 'Товар',
              price: p.price || 0,
              priceSale: p.priceSale,
              qty: p.count || 1,
              imageUrl: p.product.productImageLinks[0] || null,
              remains: p.product.remains
            }));

            // Рассчитываем скидку
            this.calculateDiscount();
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Ошибка загрузки корзины:', err);
          this.isLoading = false;
        }
      });
  }

  calculateDiscount(): void {
    const total = this.getProductsTotal();
    let discountPercent = 0;

    // Находим подходящую скидку
    for (const rule of this.discountRules.reverse()) {
      if (total >= rule.minAmount) {
        discountPercent = rule.discountPercent;
        break;
      }
    }

    this.discount = total * (discountPercent / 100);
  }

  getUniqueProductsCount(): number {
    return this.basketProducts.length;
  }

  getTotalProductsCount(): number {
    return this.basketProducts.reduce((total, product) => total + product.qty, 0);
  }

  getProductsTotal(): number {
    return this.basketProducts.reduce((total, product) => total + (product.price * product.qty), 0);
  }

  getDeliveryCost(): number {
    // Логика расчета доставки (можно получать из формы)
    if (this.deliveryCost > 0) {
      return this.deliveryCost;
    }

    // Пример: бесплатная доставка от 5000
    const total = this.getProductsTotal();
    this.deliveryCost = total >= 5000 ? 0 : this.deliveryCost;
    return this.deliveryCost
  }

  setDeliveryCost(value: any) {
    this.deliveryCost = value;
  }

  getOrderTotal(): number {
    return this.getProductsTotal() + this.getDeliveryCost() - this.discount;
  }

  canProceedToPayment(): boolean {
    return !!this.createdOrderId && !this.isProcessing && this.paymentMethod === 'online';
  }

  onOrderCreated(order: any): void {
    this.isSaving = true;
    this.savingProgress = 0;

    // Симуляция прогресса сохранения
    const progressInterval = setInterval(() => {
      this.savingProgress += 20;
      if (this.savingProgress >= 100) {
        clearInterval(progressInterval);
        this.savingProgress = 100;
        setTimeout(() => {
          this.isSaving = false;
          this.createdOrderId = order.id;
          this.showSuccessNotification = true;

          if (order.deliveryCost) {
            this.deliveryCost = order.deliveryCost;
          }
        }, 500);
      }
    }, 100);
  }

  onOrderUpdated(order: any): void {
    this.createdOrderId = order.id;

    if (order.deliveryCost) {
      this.deliveryCost = order.deliveryCost;
    }
  }

  onOrderDelivery(data: {
    'type': string,
    'id': string,
    'shopCity'?: string,
    'shopAddress'?: string
  }) {
    console.log('datadatadata', data)
  }

  onFormChanged(data: any) {
    console.log('data---:', data)
  }

  showPaymentWidget: boolean = false
  paymentToken: any;

  /**
   * Новый метод для обработки заказа в зависимости от способа оплаты
   */
  processOrder(): void {
    if (!this.paymentMethod) {
      console.warn('Выберите способ оплаты');
      return;
    }

    if (this.paymentMethod === 'online') {
      this.initiatePayment();
    } else {
      this.createOrderWithCashPayment();
    }
  }

  /**
   * Создание заказа с оплатой при получении
   */
  createOrderWithCashPayment(): void {
    this.isProcessing = true;

    // Здесь должен быть вызов API для создания заказа с пометкой "оплата при получении"
    // Имитация запроса
    setTimeout(() => {
      this.isProcessing = false;
      this.showSuccessNotification = true;

      // Генерируем тестовый ID заказа если его нет
      if (!this.createdOrderId) {
        this.createdOrderId = 'order_' + Math.random().toString(36).substr(2, 9);
      }
    }, 1500);
  }

  /**
   * Инициализация онлайн оплаты
   */
  initiatePayment() {
    // if (!this.createdOrderId) {
    //   console.warn('Нельзя перейти к оплате: заказ не создан');
    //   return;
    // }

    this.isProcessing = true;

    this.paymentService.createTopUpTransaction(this.getOrderTotal()).subscribe({
      next: (response: any) => {
        if (response.data && response.data.confirmationToken) {
          this.paymentToken = response.data.confirmationToken;
          this.showPaymentWidget = true;
        } else {
          console.error('Не получен confirmationToken');
          this.handlePaymentError('Не удалось получить токен оплаты');
        }
        this.isProcessing = false;
      },
      error: (error) => {
        console.error('Ошибка при создании платежа:', error);
        this.handlePaymentError(error);
        this.isProcessing = false;
      }
    });
  }

  /**
   * Обработка успешного платежа
   */
  handlePaymentSuccess(event: any): void {
    console.log('Платеж успешен:', event);

    // event может содержать token и amount
    const token = event.token || event;

    this.isProcessing = true;

    this.paymentService.confirmPayment(token).subscribe({
      next: (response: any) => {
        console.log('Платеж подтвержден:', response);

        // Показываем уведомление об успешной оплате
        this.showSuccessNotification = true;
        this.showPaymentWidget = false;
        this.isProcessing = false;

        // Здесь можно обновить статус заказа или баланс
      },
      error: (error) => {
        console.error('Ошибка подтверждения платежа:', error);

        // Можно показать сообщение, что платеж прошел, но данные не обновились
        this.handlePaymentError('Платеж прошел, но не удалось обновить данные. Обратитесь в поддержку.');
        this.showPaymentWidget = false;
        this.isProcessing = false;
      }
    });
  }

  /**
   * Обработка неудачного платежа
   */
  handlePaymentFail(event: any): void {
    console.log('Платеж не удался:', event);
    this.showPaymentWidget = false;

    // Можно показать уведомление об ошибке
    // this.showErrorNotification('Оплата не удалась. Попробуйте снова.');
  }

  /**
   * Обработка ошибки платежа
   */
  handlePaymentError(error: any): void {
    console.error('Ошибка платежа:', error);
    this.showPaymentWidget = false;

    // Показать уведомление об ошибке
    // this.showErrorNotification('Произошла ошибка при оплате');
  }

  /**
   * Обработка закрытия виджета
   */
  handleWidgetClose(): void {
    console.log('Виджет закрыт');
    this.showPaymentWidget = false;
    this.isProcessing = false;
  }


}