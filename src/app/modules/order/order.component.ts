import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrderFormComponent } from './order-form/order-form.component';
import { BasketsService } from '../../core/api/baskets.service';
import { DeliveryOrderService } from '../../core/api/delivery-order.service';
import { Subject, takeUntil, interval } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { PluralPipe } from "../../core/pipes/plural.pipe";

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    OrderFormComponent,
    FormsModule,
    PluralPipe
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
    private deliveryOrderService: DeliveryOrderService
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
          if (response.data?.products) {
            this.basketProducts = response.data.products.map((p: any) => ({
              id: p.id,
              name: p.name || p.shortName || 'Товар',
              price: p.price || p.retailPrice || 0,
              qty: p.qty || p.count || 1,
              imageUrl: p.imageUrl || null
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
    return total >= 5000 ? 0 : 500;
  }

  getOrderTotal(): number {
    return this.getProductsTotal() + this.getDeliveryCost() - this.discount;
  }

  canProceedToPayment(): boolean {
    return !!this.createdOrderId && !this.isProcessing;
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
    'id': string
  }) { 
    
  }

  onFormChanged(data:any){
console.log('data---:',data)
  }

  proceedToPayment(): void {
    if (!this.createdOrderId || this.isProcessing) return;

    this.isProcessing = true;

    // Небольшая задержка для лучшего UX
    setTimeout(() => {
      this.router.navigate(['/payment', this.createdOrderId]);
      this.isProcessing = false;
    }, 500);
  }
}