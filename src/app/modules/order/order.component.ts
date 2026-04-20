import { Component, OnInit, OnDestroy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrderFormComponent } from './order-form/order-form.component';
import { BasketsService } from '../../core/api/baskets.service';
import { DeliveryOrderService } from '../../core/api/delivery-order.service';
import { Subject, takeUntil, interval, finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { PluralPipe } from "../../core/pipes/plural.pipe";
import { PaymentService } from '../../core/api/payment.service';
import { PaymentWidgetComponent } from '../../core/components/payment-widget/payment-widget.component';
import { InvoiceDeliveryComponent, InvoiceDeliveryMethod } from './invoice-delivery/invoice-delivery.component';
import { TitleComponent } from '../../core/components/title/title.component';
import { TopupModalComponent } from '../../core/components/topup-modal/topup-modal.component';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    OrderFormComponent,
    FormsModule,
    PaymentWidgetComponent,
    InvoiceDeliveryComponent,
    TitleComponent,
    TopupModalComponent
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
  showsuccessNotification = false;
  isLoading = false;
  isSaving = false;
  isProcessing = false;
  savingProgress = 0;
  currentDate = new Date();

  operativeInfo = computed(() => this.userService.operativeInfo())


  orderData: any;
  // Данные формы заказа
  orderFormData: any = null;

  // Способ оплаты
  paymentMethod: 'online' | 'cash' | 'card' | 'invoice' = 'online';

  // Скидки
  discountRules = [
    { minAmount: 10000, discountPercent: 5 },
    { minAmount: 20000, discountPercent: 10 },
    { minAmount: 50000, discountPercent: 15 }
  ];

  private destroy$ = new Subject<void>();

  // Флаги для отслеживания статуса
  isOrderCreated = false;
  isPaymentConfirmed = false;

  // Пополнение баланса
  showTopupModal: boolean = false;
  topupAmount: number = 0;
  topupMinAmount: number = 0;
  isProcessingTopup: boolean = false;
  paymentToken: string | null = null;
  showPaymentWidget: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private basketsService: BasketsService,
    private deliveryOrderService: DeliveryOrderService,
    private paymentService: PaymentService
  ) { }

  private userService = inject(UserService);

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
    interval(60000)
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
          this.orderData = response.data;
          console.log('Order data loaded:', this.orderData);

          if (response.data?.productPositions) {
            this.basketProducts = response.data.productPositions.map((p: any) => ({
              id: p.product.id,
              name: p.product.name || p.product.fullName || 'Товар',
              price: p.price || 0,
              priceSale: p.priceSale,
              qty: p.count || 1,
              imageUrl: p.product.productImageLinks?.[0] || null,
              remains: p.product.remains,
              positionId: p.id
            }));

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
    if (this.deliveryCost > 0) {
      return this.deliveryCost;
    }
    const total = this.getProductsTotal();
    this.deliveryCost = total >= 5000 ? 0 : this.deliveryCost;
    return this.deliveryCost;
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

  /**
   * Сохранение данных из формы заказа
   */
  onFormChanged(data: any) {
    this.orderFormData = data;
    console.log('Данные формы обновлены:', data);
  }

  /**
   * Обработка создания заказа
   */
  onOrderCreated(order: any): void {
    this.createdOrderId = order.id;
    this.isOrderCreated = true;

    if (order.deliveryCost) {
      this.deliveryCost = order.deliveryCost;
    }

    this.showsuccessNotification = true;
  }

  /**
   * Обработка обновления заказа
   */
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
    'addressId'?: string,
    'shopAddress'?: string
  }) {
    this.orderFormData.addressId = data.addressId;
    console.log('Данные доставки:', data);

  }

  /**
   * Основной метод обработки заказа
   */
  processOrder(): void {
    if (!this.paymentMethod) {
      console.warn('Выберите способ оплаты');
      return;
    }

    if (!this.orderFormData) {
      console.warn('Заполните форму заказа');
      return;
    }

    if (this.paymentMethod === 'online') {
      this.createOrderAndInitiatePayment();
    } else {
      this.createOrderWithCashPayment();
    }
  }

  /**
   * Создание заказа и инициализация онлайн оплаты
   */
  private createOrderAndInitiatePayment(): void {
    this.isProcessing = true;
    this.isSaving = true;
    this.savingProgress = 0;

    // Имитация прогресса
    const progressInterval = setInterval(() => {
      this.savingProgress += 20;
      if (this.savingProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
    const orderRequest: any = {
      id: this.activeBasketId!,
      addressId: this.orderFormData.orderDeliveryData.id,
      deliveryTypeId: this.orderFormData.delivery === 'transport' || this.orderFormData.delivery === 'city'
        ? '2f146e32-b270-4046-95f2-3350bc7f42d4'
        : this.orderFormData.delivery === 'pickup'
          ? '94656a5f-31ff-4a36-8214-555e8507c790'
          : undefined,
      edoType: this.orderFormData.edoType ? this.orderFormData.edoType : undefined,
      partnerInstanceId: this.orderFormData.selectedCompanyId,
      contactType: this.orderFormData.contactType,
      promoCodeId: this.orderFormData.promoCodeId,
      consultation: this.orderFormData.needConsult || false,
      // this.orderFormData.info
      productPlaceId: this.orderFormData.orderDeliveryData.shopAddress,
      paymentType: this.paymentMethod === 'online' ? 0 : this.paymentMethod === 'cash' ? 1 : this.paymentMethod === 'card' ? 2 : this.paymentMethod === 'invoice' ? 4 : this.paymentMethod === 'balance' ? 3 : null,
      // orderDateTime: this.orderFormData.orderDateTime || new Date().toISOString(),
      // productPositionIds: this.basketProducts.map(p => p.positionId)
    };

    Object.keys(orderRequest).forEach(key => {
      if (orderRequest[key] === null || orderRequest[key] === undefined) {
        delete orderRequest[key];
      }
    });


    if (this.activeBasketId) {
      this.deliveryOrderService.updateOrder(this.activeBasketId, orderRequest)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            clearInterval(progressInterval);
            this.isSaving = false;
          })
        )
        .subscribe({
          next: (response: any) => {
            this.createdOrderId = response.data.id;
            this.isOrderCreated = true;

            // Инициируем оплату
            this.initiatePayForTheOrderTransaction();
          },
          error: (error) => {
            console.error('Ошибка создания заказа:', error);
            this.isProcessing = false;
            this.showErrorNotification('Не удалось создать заказ. Попробуйте позже.');
          }
        });
    }
  }

  /**
   * Создание заказа с оплатой при получении
   */
  private createOrderWithCashPayment(): void {
    this.isProcessing = true;
    this.isSaving = true;
    this.savingProgress = 0;

    const progressInterval = setInterval(() => {
      this.savingProgress += 20;
      if (this.savingProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);

    const orderRequest: any = {
      id: this.activeBasketId!,
      addressId: this.orderFormData.orderDeliveryData.id,
      deliveryTypeId: this.orderFormData.delivery === 'transport' || this.orderFormData.delivery === 'city'
        ? '2f146e32-b270-4046-95f2-3350bc7f42d4'
        : this.orderFormData.delivery === 'pickup'
          ? '94656a5f-31ff-4a36-8214-555e8507c790'
          : undefined,
      edoType: this.orderFormData.edoType ? this.orderFormData.edoType : undefined,
      partnerInstanceId: this.orderFormData.selectedCompanyId,
      contactType: this.orderFormData.contactType,
      promoCodeId: this.orderFormData.promoCodeId,
      consultation: this.orderFormData.needConsult || false,
      // this.orderFormData.info
      productPlaceId: this.orderFormData.orderDeliveryData.shopAddress,
      paymentType: this.paymentMethod === 'online' ? 0 : this.paymentMethod === 'cash' ? 1 : this.paymentMethod === 'card' ? 2 : this.paymentMethod === 'invoice' ? 4 : this.paymentMethod === 'balance' ? 3 : null,
      // orderDateTime: this.orderFormData.orderDateTime || new Date().toISOString(),
      // productPositionIds: this.basketProducts.map(p => p.positionId)
    };

    Object.keys(orderRequest).forEach(key => {
      if (orderRequest[key] === null || orderRequest[key] === undefined) {
        delete orderRequest[key];
      }
    });

    if (this.activeBasketId) {
      this.deliveryOrderService.updateOrder(this.activeBasketId, orderRequest)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            clearInterval(progressInterval);
            this.isSaving = false;
            this.isProcessing = false;
          })
        )
        .subscribe({
          next: (response: any) => {
            this.createdOrderId = response.data.id;
            this.isOrderCreated = true;
            this.showsuccessNotification = true;

            // setTimeout(() => {
            //   this.router.navigate(['/order-success', this.createdOrderId]);
            // }, 2000);
          },
          error: (error) => {
            console.error('Ошибка создания заказа:', error);
            this.isProcessing = false;
            this.showErrorNotification('Не удалось создать заказ. Попробуйте позже.');
          }
        });
    }
  }

  /**
   * Инициализация оплаты заказа с проверкой баланса
   */
  initiatePayForTheOrderTransaction(): void {
    if (!this.createdOrderId) {
      console.warn('Нельзя перейти к оплате: заказ не создан');
      return;
    }

    this.isProcessing = true;

    this.paymentService.payForTheOrderTransaction(this.createdOrderId).subscribe({
      next: (response: any) => {
        this.isProcessing = false;

        // Проверяем наличие ошибки
        if (response.data.errorMessage && response.data.errorMessage !== null) {
          // Если есть сообщение об ошибке - показываем его
          this.showErrorNotification(response.errorMessage);
          return;
        }

        // Если ошибки нет, проверяем costDelta
        if (response.data.costDelta && response.data.costDelta > 0) {
          // Не хватает средств - показываем диалог пополнения
          this.topupMinAmount = response.data.costDelta;
          this.showInsufficientFundsDialog(response.data.costDelta, response.data.totalCost);
        } else {
          // Средств достаточно - переходим к оплате
          this.initiatePayment();
        }
      },
      error: (error) => {
        console.error('Ошибка при проверке оплаты заказа:', error);
        this.isProcessing = false;
        this.handlePaymentError(error.error?.message || 'Произошла ошибка при проверке оплаты');
      }
    });
  }

  /**
   * Показывает диалог о недостаточности средств
   */
  private showInsufficientFundsDialog(costDelta: number, totalCost: number): void {
    const message = `Недостаточно средств на балансе. Не хватает ${this.formatCurrency(costDelta)}.\n\nОбщая стоимость заказа: ${this.formatCurrency(totalCost)}\n\nПополнить баланс?`;

    const userChoice = confirm(message + '\n\nНажмите "ОК" для пополнения баланса или "Отмена" для выбора другого способа оплаты');

    if (userChoice) {
      // Пополнение баланса
      this.topupAmount = costDelta;
      this.showTopupModal = true;
    } else {
      // Предложить выбрать другой способ оплаты
      this.suggestAlternativePaymentMethod();
    }
  }

  /**
   * Предлагает выбрать альтернативный способ оплаты
   */
  private suggestAlternativePaymentMethod(): void {
    const message = 'Вы можете выбрать другой способ оплаты: наличными или картой при получении.';
    const userChoice = confirm(message + '\n\nНажмите "ОК" для выбора другого способа оплаты');

    if (userChoice) {
      // Меняем способ оплаты на наличные
      this.paymentMethod = 'cash';
      // Обновляем заказ с новым способом оплаты
      this.updateOrderPaymentMethod();
    }
  }

  /**
   * Обновляет способ оплаты заказа
   */
  private updateOrderPaymentMethod(): void {
    const orderRequest: any = {
      id: this.activeBasketId!,
      paymentType: 1 // Наличные при получении
    };

    if (this.activeBasketId) {
      this.deliveryOrderService.updateOrder(this.activeBasketId, orderRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            console.log('Способ оплаты обновлен:', response);
            this.showSuccessNotification('Способ оплаты изменен на "Наличными при получении"');
          },
          error: (error) => {
            console.error('Ошибка обновления способа оплаты:', error);
          }
        });
    }
  }

  /**
   * Обработка пополнения баланса из модального окна
   */
  handleTopup(amount: number): void {
    this.topupAmount = amount;
    this.isProcessingTopup = true;

    this.paymentService.createTopUpTransaction(amount).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isProcessingTopup = false;
      })
    ).subscribe({
      next: (response: any) => {
        if (response.data && response.data.confirmationToken) {
          this.paymentToken = response.data.confirmationToken;
          this.showPaymentWidget = true;
          this.showTopupModal = false;
        } else {
          console.error('Не получен confirmationToken');
          this.handlePaymentError('Не удалось получить токен оплаты');
        }
      },
      error: (error) => {
        console.error('Ошибка при создании платежа:', error);
        this.handlePaymentError(error);
      }
    });
  }

  /**
   * Закрыть модальное окно пополнения
   */
  closeTopupModal(): void {
    this.showTopupModal = false;
  }

  /**
   * Инициализация онлайн оплаты
   */
  initiatePayment() {
    if (!this.createdOrderId) {
      console.warn('Нельзя перейти к оплате: заказ не создан');
      return;
    }

    this.isProcessing = true;

    // Создаем транзакцию для оплаты
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

    const token = event.token || event;
    this.isProcessing = true;
    // Создаем DTO для обновления заказа
    const updateDto: any = {
      consultation: this.orderFormData?.consultation || false,
      orderDateTime: new Date().toISOString(),
      orderStatus: 2, // Статус "Оплачен"
      productPositionIds: this.basketProducts.map(p => p.positionId)
    };

    // Добавляем адрес если есть
    if (this.orderFormData?.address) {
      updateDto.address = this.orderFormData.address;
    }

    if (this.orderFormData?.deliveryTypeId) {
      updateDto.deliveryTypeId = this.orderFormData.deliveryTypeId;
    }

    if (this.activeBasketId) {
      // Обновляем заказ с новым статусом
      this.deliveryOrderService.updateOrder(this.activeBasketId, updateDto)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.isProcessing = false;
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Заказ обновлен после оплаты:', response);

            // Подтверждаем платеж на сервере
            this.paymentService.confirmPayment(token).subscribe({
              next: (confirmResponse) => {
                console.log('Платеж подтвержден:', confirmResponse);

                this.showPaymentWidget = false;
                this.isPaymentConfirmed = true;
                this.showsuccessNotification = true;

                // Перенаправляем на страницу успеха
                setTimeout(() => {
                  this.router.navigate(['/order-success', this.createdOrderId]);
                }, 2000);
              },
              error: (error) => {
                console.error('Ошибка подтверждения платежа:', error);
                this.handlePaymentError('Платеж прошел, но не удалось подтвердить заказ');
              }
            });
          },
          error: (error) => {
            console.error('Ошибка обновления заказа:', error);
            this.handlePaymentError('Не удалось обновить статус заказа');
          }
        });
    }
  }

  /**
   * Обработка неудачного платежа
   */
  handlePaymentFail(event: any): void {
    console.log('Платеж не удался:', event);
    this.showPaymentWidget = false;
    this.showErrorNotification('Оплата не удалась. Попробуйте снова.');
  }

  /**
   * Обработка ошибки платежа
   */
  handlePaymentError(error: any): void {
    console.error('Ошибка платежа:', error);
    this.showPaymentWidget = false;
    this.isProcessing = false;
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Произошла ошибка при оплате';
    this.showErrorNotification(errorMessage);
  }

  /**
   * Обработка закрытия виджета
   */
  handleWidgetClose(): void {
    console.log('Виджет закрыт');
    this.showPaymentWidget = false;
    this.isProcessing = false;
  }

  /**
   * Показать уведомление об успехе
   */
  private showSuccessNotification(message: string): void {
    alert(message);
  }

  /**
   * Показать уведомление об ошибке
   */
  private showErrorNotification(message: string): void {
    alert(message);
  }

  /**
   * Форматирование валюты
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  invoiceDeliveryMethod: InvoiceDeliveryMethod = 'email';
  invoiceEmail: string = '';

  // Метод
  onInvoiceDeliverySelected(data: { method: InvoiceDeliveryMethod; email: string }): void {
    console.log('Способ доставки счета:', data.method);
    console.log('Email для счета:', data.email);

    // Здесь можно отправить данные на сервер
    if (data.method === 'email') {
      this.orderFormData.edoType = 0;
      // Отправка на email
    } else if (data.method === 'sbis') {
      this.orderFormData.edoType = 1;
      // Отправка через СБИС
    } else if (data.method === 'kontur') {
      this.orderFormData.edoType = 2;
      // Отправка через Контур
    }
  }
}