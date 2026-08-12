import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { Router } from '@angular/router';

// Импортируйте ваши сервисы и интерфейсы
import { DeliveryOrderService } from '../../core/api/delivery-order.service';
import { BasketsService } from '../../core/api/baskets.service';

// 🔹 Интерфейсы для типизации (замените на ваши реальные)
export interface OrderProductItem {
  id: string;
  count: number;
  price?: number;
  product?: {
    id: string;
    fullName: string;
    retailPrice: number;
    barcode?: string;
    imageUrl?: string;
  };
}

export interface OrderUpdateDto {
  id: string;              // ✅ Обязательно: ID заказа
  productPositionIds: string[];
  consultation?: number | null;
  orderStatus?: number;
  orderDateTime?: string;
}

@Component({
  selector: 'app-edit-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-order.component.html',
  styleUrls: ['./edit-order.component.scss']
})
export class EditOrderComponent implements OnInit, OnDestroy {
  @Input() orderId: string | null = null;
  @Input() orderProducts: OrderProductItem[] = [];
  @Input() orderTotal: number = 0;
  @Output() orderSubmitted = new EventEmitter<void>();
  @Output() productChanged = new EventEmitter<{ productId: string; quantity: number }>();

  isLoading = false;
  isProcessing = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private deliveryOrderService: DeliveryOrderService,
    private basketsService: BasketsService
  ) {}

  ngOnInit(): void {
    if (this.orderId && !this.orderProducts.length) {
      this.loadOrderProducts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public loadOrderProducts(): void {
    if (!this.orderId) return;
    
    this.isLoading = true;
    
    this.basketsService.getBasketById(this.orderId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (res: any) => {
          // 🔹 Безопасное извлечение данных с проверкой типов
          this.orderProducts = (res.data?.products || []) as OrderProductItem[];
          // 🔹 totalCost может называться иначе — проверьте ваш API
          this.orderTotal = res.data?.totalCost ?? res.data?.orderCost ?? 0;
        },
        error: () => {
          this.error = 'Не удалось загрузить товары заказа';
        }
      });
  }

  onQuantityChange(product: OrderProductItem, newQuantity: number): void {
    if (newQuantity < 1) return;
    
    product.count = newQuantity;
    this.productChanged.emit({ 
      productId: product.product?.id || product.id, 
      quantity: newQuantity 
    });
    
    this.recalculateTotal();
  }

  onRemoveProduct(productId: string): void {
    if (confirm('Удалить этот товар из заказа?')) {
      this.productChanged.emit({ productId, quantity: 0 });
      this.orderProducts = this.orderProducts.filter(p => p.id !== productId);
      this.recalculateTotal();
    }
  }

  private recalculateTotal(): void {
    this.orderTotal = this.orderProducts.reduce((sum, p) => {
      const price = p.product?.retailPrice ?? p.price ?? 0;
      return sum + (price * (p.count ?? 1));
    }, 0);
  }

  canProceed(): boolean {
    return this.orderProducts.length > 0 && !this.isLoading && !this.isProcessing;
  }

  proceedToCheckout(): void {
    if (!this.canProceed() || !this.orderId) return;
    
    this.isProcessing = true;
    
    const productPositionIds = this.orderProducts.map(p => p.id);
    
    // 🔹 Правильная структура DTO согласно вашему интерфейсу
    const updateDto: OrderUpdateDto = {
      id: this.orderId,                    // ✅ Обязательно
      productPositionIds,
      orderStatus: 1,                      // или нужный статус
      consultation: null,                  // если требуется
      // orderDateTime: new Date().toISOString() // если требуется
    };
    
    // this.deliveryOrderService.updateOrder(this.orderId, updateDto)
    //   .pipe(
    //     takeUntil(this.destroy$),
    //     finalize(() => this.isProcessing = false)
    //   )
    //   .subscribe({
    //     next: (response) => {
    //       this.orderSubmitted.emit();
    //       this.router.navigate(['/order', this.orderId]);
    //     },
    //     error: (err) => {
    //       this.error = 'Не удалось обновить заказ. Попробуйте позже.';
    //     }
    //   });
  }

  getProductPrice(product: OrderProductItem): number {
    return product.product?.retailPrice ?? product.price ?? 0;
  }

  getProductTotal(product: OrderProductItem): number {
    return this.getProductPrice(product) * (product.count ?? 1);
  }

  trackByProduct(index: number, product: OrderProductItem): string {
    return product.id;
  }
}