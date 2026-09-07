import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductComponent } from './product/product.component';
import { BasketsService } from '../../core/api/baskets.service';
import { UserBasket, CreateBasketDto, BasketProductDto } from '../../../models/baskets.interface';
import { DeliveryOrderService } from '../../core/api/delivery-order.service';
import { Subject, debounceTime, takeUntil, switchMap, finalize } from 'rxjs';
import { StorageUtils } from '../../../utils/storage.utils';
import { localStorageEnvironment, memoryCacheEnvironment } from '../../../environment';
import { ProductsService } from '../../core/services/products.service';
import { EmptyStateComponent } from '../../core/components/empty-state/empty-state.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ProductComponent,
    EmptyStateComponent
  ],
})
export class CartComponent implements OnInit, OnDestroy {
  baskets: any[] = [];
  activeBasket: any = null;
  isPopupOpen = false;
  popupMode: 'create' | 'rename' = 'create';
  popupInputValue = '';
  selectedProducts: Set<string> = new Set();

  isLoading = false;
  isPopupLoading = false;
  error: string | null = null;
  notification: { message: string; type: 'success' | 'error' | 'warning' } | null = null;
  step = 1;

  filter: 'all' | 'available' | 'discount' = 'all';
  recommendedProducts: any[] = [];
  promoCode = '';
  showPromo = false;
  appliedPromo: string | null = null;
  deliveryCost = 0;
  deliveryInfoOpen = false;
  quickViewProduct: any = null;

  totalItems = 0;
  subtotal = 0;
  totalDiscount = 0;
  total = 0;
  retailTotal = 0;
  totalSaving = 0;
  hasActivePromo = false;
  promoPercent = 0;

  private destroy$ = new Subject<void>();
  private quantityUpdate$ = new Subject<{ productId: string; basketId: string; quantity: number }>();

  constructor(
    private basketsService: BasketsService,
    private productsService: ProductsService,
    private deliveryOrderService: DeliveryOrderService,
    public router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.quantityUpdate$
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$),
        switchMap((event) => {
          this.isLoading = true;
          const dto: BasketProductDto = {
            productId: event.productId,
            basketId: event.basketId,
            count: event.quantity
          };
          return this.basketsService.addProduct(dto).pipe(
            finalize(() => {
              this.isLoading = false;
              this.cdr?.markForCheck();
            })
          );
        })
      )
      .subscribe({
        next: () => {
          this.loadActiveBasket(true);
          this.showNotification('Количество обновлено', 'success');
        },
        error: (err) => {
          this.showNotification('Не удалось обновить количество', 'error');
          this.loadActiveBasket(true);
        }
      });
  }

  ngOnInit(): void {
    this.loadBasketsFromCache();
    this.loadRecommendations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBasketsFromCache(): void {
    const cachedBaskets = StorageUtils.getMemoryCache(memoryCacheEnvironment.baskets.key);

    if (cachedBaskets && Array.isArray(cachedBaskets)) {
      this.baskets = cachedBaskets;
      this.activeBasket = this.baskets.find(
        (basket: any) => basket.isActiveBasket === true
      );
      if (!this.activeBasket && this.baskets.length > 0) {
        this.activeBasket = this.baskets[0];
      }
      if (this.activeBasket) {
        this.loadActiveBasket();
      }
    } else {
      this.loadBaskets();
    }
  }

  loadBaskets(): void {
    this.isLoading = true;
    this.error = null;

    this.basketsService
      .filterBaskets({
        filters: [],
        sorts: [],
        page: 0,
        pageSize: 10,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (res) => {
          this.baskets = res.data;
          StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);
          this.activeBasket = this.baskets.find(
            (basket: any) => basket.isActiveBasket === true
          );
          if (!this.activeBasket && this.baskets.length > 0) {
            this.activeBasket = this.baskets[0];
          }
          if (this.activeBasket) {
            this.loadActiveBasket();
          }
        },
        error: (err) => {
          this.error = 'Не удалось загрузить корзины. Пожалуйста, попробуйте позже.';
        },
      });
  }

  loadActiveBasket(updateCache: boolean = false): void {
    if (!this.activeBasket) return;
    this.isLoading = true;

    this.basketsService.getBasketById(this.activeBasket.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (value: any) => {
          this.activeBasket = value.data;
          if (updateCache) {
            const basketIndex = this.baskets.findIndex(b => b.id === this.activeBasket.id);
            if (basketIndex !== -1) {
              this.baskets[basketIndex] = {
                ...this.baskets[basketIndex],
                ...this.activeBasket,
                productCount: this.activeBasket.products?.length || 0
              };
              StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);
            }
          }
          this.selectedProducts.clear();
          this.calculateTotals();
        },
        error: (err) => {
          this.error = 'Не удалось загрузить содержимое корзины.';
        }
      });
  }

  selectBasket(basket: UserBasket): void {
    if (this.activeBasket?.id === basket.id) return;
    this.activeBasket = basket;
    this.loadActiveBasket();
    this.baskets = this.baskets.map(b => ({
      ...b,
      isActiveBasket: b.id === basket.id
    }));
    StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);
  }

  openCreatePopup(): void {
    this.popupMode = 'create';
    this.popupInputValue = '';
    this.isPopupOpen = true;
  }

  renameBasket(): void {
    if (!this.activeBasket) return;
    this.popupMode = 'rename';
    this.popupInputValue = this.activeBasket.name;
    this.isPopupOpen = true;
  }

  closePopup(): void {
    this.isPopupOpen = false;
    this.popupInputValue = '';
  }

  confirmPopupAction(): void {
    const value = this.popupInputValue.trim();
    if (!value) return;
    if (this.popupMode === 'create') {
      this.createBasket(value);
    } else {
      this.updateBasketName(value);
    }
  }

  private createBasket(name: string): void {
    this.isPopupLoading = true;
    const dto: CreateBasketDto = { name, products: [] };
    this.basketsService.createBasket(dto)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isPopupLoading = false)
      )
      .subscribe({
        next: (res) => {
          const newBasket = res.data;
          this.baskets.push(newBasket);
          this.activeBasket = newBasket;
          StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);
          this.closePopup();
          this.showNotification('Корзина успешно создана', 'success');
        },
        error: (err) => {
          this.showNotification('Не удалось создать корзину', 'error');
        },
      });
  }

  private updateBasketName(name: string): void {
    if (!this.activeBasket) return;
    this.isPopupLoading = true;
    setTimeout(() => {
      this.activeBasket.name = name;
      const basketIndex = this.baskets.findIndex(b => b.id === this.activeBasket.id);
      if (basketIndex !== -1) {
        this.baskets[basketIndex].name = name;
        StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);
      }
      this.isPopupLoading = false;
      this.closePopup();
      this.showNotification('Название корзины обновлено', 'success');
    }, 500);
  }

  deleteBasket(basket: any, event: Event): void {
    event.stopPropagation();
    if (this.baskets.length <= 1) {
      this.showNotification('Нельзя удалить последнюю корзину', 'warning');
      return;
    }
    if (confirm(`Удалить корзину "${basket.name}"?`)) {
      this.isLoading = true;
      this.basketsService.deleteBasket(basket.id)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.isLoading = false)
        )
        .subscribe({
          next: () => {
            this.baskets = this.baskets.filter(b => b.id !== basket.id);
            if (this.activeBasket?.id === basket.id) {
              this.activeBasket = this.baskets[0];
              this.loadActiveBasket();
            }
            StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);
            this.showNotification('Корзина удалена', 'success');
          },
          error: (err) => {
            this.showNotification('Не удалось удалить корзину', 'error');
          }
        });
    }
  }

  duplicateBasket(): void {
    if (!this.activeBasket) return;
    this.isLoading = true;
    const dto: CreateBasketDto = {
      name: `${this.activeBasket.name} (копия)`,
      products: this.activeBasket.products?.map((p: any) => ({
        productId: p.product?.id,
        count: p.count
      })) || [],
    };
    this.basketsService.createBasket(dto)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (res) => {
          const newBasket = res.data;
          this.baskets.push(newBasket);
          this.activeBasket = newBasket;
          StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);
          this.showNotification('Корзина продублирована', 'success');
        },
        error: (err) => {
          this.showNotification('Не удалось продублировать корзину', 'error');
        }
      });
  }

  isSelected(id: string): boolean {
    return this.selectedProducts.has(id);
  }

  onProductSelected(event: { id: string; selected: boolean }): void {
    if (event.selected) {
      this.selectedProducts.add(event.id);
    } else {
      this.selectedProducts.delete(event.id);
    }
  }

  selectAll(): void {
    if (!this.activeBasket?.products) return;
    this.activeBasket.products.forEach((p: any) => {
      this.selectedProducts.add(p.id);
    });
  }

  removeSelectedProducts(): void {
    if (this.selectedProducts.size === 0) return;
    const productIds = Array.from(this.selectedProducts);
    if (confirm(`Удалить ${productIds.length} товар(ов) из корзины?`)) {
      this.isLoading = true;
      const requests = productIds.map(productId =>
        this.basketsService.changeProductFromBasket(
          this.activeBasket.id,
          productId,
          0
        )
      );
      let completed = 0;
      const processNext = (index: number) => {
        if (index >= requests.length) {
          this.isLoading = false;
          this.selectedProducts.clear();
          this.loadActiveBasket(true);
          this.showNotification(`${productIds.length} товаров удалено из корзины`, 'success');
          return;
        }
        requests[index].pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            completed++;
            processNext(index + 1);
          },
          error: (err) => {
            this.showNotification(
              `Удалено ${completed} из ${productIds.length} товаров. Ошибка при удалении остальных.`,
              'error'
            );
            this.isLoading = false;
            this.loadActiveBasket(true);
          }
        });
      };
      processNext(0);
    }
  }

  onQuantityChange(event: { id: string; barcodeId: string; quantity: number }): void {
    if (!this.activeBasket?.products || !this.activeBasket.id) return;
    const product = this.activeBasket.products.find((p: any) => p.id === event.id);
    if (product) {
      product.count = event.quantity;
      this.calculateTotals();
      this.quantityUpdate$.next({
        productId: event.barcodeId,
        basketId: this.activeBasket.id,
        quantity: event.quantity
      });
    }
  }

  onProductRemove(data: any): void {
    this.isLoading = true;
    this.basketsService.changeProductFromBasket(this.activeBasket.id, data.productId, 0)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: () => {
          this.loadActiveBasket(true);
          this.showNotification('Товар удален из корзины', 'success');
        },
        error: (err) => {
          this.showNotification('Не удалось удалить товар', 'error');
        }
      });
  }

  onQuickView(product: any): void {
    this.quickViewProduct = product;
  }

  closeQuickView(): void {
    this.quickViewProduct = null;
  }

  onAddRelated(item: any): void {
    if (!this.activeBasket?.id) return;
    const dto: BasketProductDto = {
      productId: item.id,
      basketId: this.activeBasket.id,
      count: 1
    };
    this.basketsService.addProduct(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadActiveBasket(true);
          this.showNotification('Товар добавлен в корзину', 'success');
        },
        error: (err) => {
          this.showNotification('Не удалось добавить товар', 'error');
        }
      });
  }

  setFilter(filter: 'all' | 'available' | 'discount'): void {
    this.filter = filter;
  }

  get filteredProducts(): any[] {
    if (!this.activeBasket?.products) return [];
    switch (this.filter) {
      case 'available':
        return this.activeBasket.products.filter((p: any) => p.product?.available !== false);
      case 'discount':
        return this.activeBasket.products.filter((p: any) => p.product?.discountPercentage > 0);
      default:
        return this.activeBasket.products;
    }
  }

  private get isHomeCity(): boolean {
    const userSelectedCity = StorageUtils.getLocalStorageCache('pktn_userCity');
    return userSelectedCity === 'Барнаул';
  }

private calculateTotals(): void {
  if (!this.activeBasket?.products) {
    this.totalItems = 0;
    this.subtotal = 0;
    this.totalDiscount = 0;
    this.total = 0;
    this.retailTotal = 0;
    this.totalSaving = 0;
    this.hasActivePromo = false;
    this.promoPercent = 0;
    return;
  }

  let items = 0;
  let subtotal = 0;
  let retailSubtotal = 0;
  let hasPromo = false;
  let maxPromoPercent = 0;

  this.activeBasket.products.forEach((product: any) => {
    const count = product.count || 1;
    const coefficient = product.productBarCode?.coefficient || 1;
    items += count;

    // 🔹 Розничная цена за единицу (в зависимости от города)
    const retailPricePerUnit = this.isHomeCity
      ? (product.product?.retailPrice || 0)
      : (product.product?.retailPriceDest || 0);
    
    // 🔹 Розничная цена за упаковку
    const retailPackPrice = retailPricePerUnit * coefficient;

    // 🔹 Фактическая цена за упаковку (priceSale если валидна)
    let finalPackPrice = product.price || 0;
    if (product.priceSale !== null && 
        product.priceSale > 0 && 
        product.priceSale < finalPackPrice) {
      finalPackPrice = product.priceSale;
    }

    // 🔹 Проверяем акцию для бейджа
    if (product.product?.promoOrders?.length > 0) {
      const promo = product.product.promoOrders.find((p: any) =>
        !p.isDeleted && p.isUse !== false && p.salePercent > 0
      );
      if (promo?.salePercent && promo.salePercent > 0) {
        hasPromo = true;
        const percent = Math.min(99, Math.round(Math.abs(promo.salePercent) * 100));
        if (percent > maxPromoPercent) maxPromoPercent = percent;
      }
    }

    // 🔹 Считаем итоги
    retailSubtotal += retailPackPrice * count;
    subtotal += finalPackPrice * count;
  });

  this.totalItems = items;
  this.subtotal = subtotal;
  this.total = subtotal + this.deliveryCost;
  this.retailTotal = retailSubtotal;
  this.totalSaving = Math.max(0, retailSubtotal - subtotal);
  this.hasActivePromo = hasPromo;
  this.promoPercent = maxPromoPercent;
  this.cdr?.markForCheck();
}

  applyPromo(): void {
    if (!this.promoCode.trim()) return;
    this.appliedPromo = this.promoCode;
    this.promoCode = '';
    this.showPromo = false;
    this.totalDiscount += 100;
    this.calculateTotals();
    this.showNotification('Промокод применен!', 'success');
  }

  private loadRecommendations(): void {
    this.recommendedProducts = [
      { id: '1', name: 'Товар 1', price: 1990, image: '' },
      { id: '2', name: 'Товар 2', price: 2990, image: '' },
      { id: '3', name: 'Товар 3', price: 3990, image: '' },
      { id: '4', name: 'Товар 4', price: 4990, image: '' },
    ];
  }

  refreshRecommendations(): void {
    this.loadRecommendations();
  }

  addRecommendedToCart(item: any): void {
    if (!this.activeBasket?.id) return;
    const dto: BasketProductDto = {
      productId: item.id,
      basketId: this.activeBasket.id,
      count: 1
    };
    this.basketsService.addProduct(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadActiveBasket(true);
          this.showNotification('Товар добавлен в корзину', 'success');
        },
        error: (err) => {
          this.showNotification('Не удалось добавить товар', 'error');
        }
      });
  }

  canProceedToCheckout(): boolean {
    return this.activeBasket?.products?.length > 0;
  }

  proceedToCheckout(): void {
    if (StorageUtils.getLocalStorageCache(localStorageEnvironment.isGuestToken.key) == true) {
      this.authService.setRedirectingToProfile(false);
      this.authService.changeVisible(true);
      return;
    }
    if (!this.canProceedToCheckout()) {
      this.showNotification('Добавьте товары в корзину', 'warning');
      return;
    }
    const productPositionIds = this.activeBasket.products.map((product: any) => product.id);
    this.deliveryOrderService.createOrder({
      'userBasketId': this.activeBasket.id,
      'orderStatus': 0,
      'productPositionIds': productPositionIds
    }).subscribe((response: any) => {
      this.router.navigate(['/order', response.data.id]);
    });
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.notification = { message, type };
    setTimeout(() => {
      this.notification = null;
      this.cdr?.markForCheck();
    }, 3000);
  }

  trackByProductId(index: number, item: any): string {
    return item.id;
  }

  trackByBasketId(index: number, item: any): string {
    return item.id;
  }

  goToCatalog(): void {
    this.router.navigate(['']);
  }
}