import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductComponent } from './product/product.component';
import { BasketsService } from '../../core/api/baskets.service';
import { UserBasket, CreateBasketDto, BasketProductDto } from '../../../models/baskets.interface';
import { DeliveryOrderService } from '../../core/api/delivery-order.service';
import { Subject, debounceTime, takeUntil, switchMap, finalize } from 'rxjs';
import { StorageUtils } from '../../../utils/storage.utils';
import { memoryCacheEnvironment } from '../../../environment';
import { ProductsService } from '../../core/services/products.service';
import { EmptyStateComponent } from '../../core/components/empty-state/empty-state.component';

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

  // Состояния
  isLoading = false;
  isPopupLoading = false;
  error: string | null = null;
  notification: { message: string; type: 'success' | 'error' | 'warning' } | null = null;
  step = 1; // 1 - корзина, 2 - оформление, 3 - оплата

  // Фильтры
  filter: 'all' | 'available' | 'discount' = 'all';

  // Рекомендации
  recommendedProducts: any[] = [];

  // Промокод
  promoCode = '';
  showPromo = false;
  appliedPromo: string | null = null;

  // Доставка
  deliveryCost = 0;
  deliveryInfoOpen = false;

  // Quick view
  quickViewProduct: any = null;

  // Дополнительные состояния
  totalItems = 0;
  subtotal = 0;
  totalDiscount = 0;
  total = 0;

  private destroy$ = new Subject<void>();
  private quantityUpdate$ = new Subject<{ productId: string; basketId: string; quantity: number }>();

  constructor(
    private basketsService: BasketsService,
    private productsService: ProductsService,
    private deliveryOrderService: DeliveryOrderService,
    public router: Router,
  ) {
    // Дебаунс для обновления количества
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
          console.error('Ошибка при обновлении количества:', err);
          this.showNotification('Не удалось обновить количество', 'error');
          this.loadActiveBasket(true); // Перезагружаем для синхронизации
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

  // Загружаем корзины из кэша
  private loadBasketsFromCache(): void {
    const cachedBaskets = StorageUtils.getMemoryCache(memoryCacheEnvironment.baskets.key);

    if (cachedBaskets && Array.isArray(cachedBaskets)) {
      this.baskets = cachedBaskets;

      // Найти активную корзину
      this.activeBasket = this.baskets.find(
        (basket: any) => basket.isActiveBasket === true
      );

      // Если активной корзины нет, взять первую
      if (!this.activeBasket && this.baskets.length > 0) {
        this.activeBasket = this.baskets[0];
      }

      // Загрузить полную информацию об активной корзине
      if (this.activeBasket) {
        this.loadActiveBasket();
      }
    } else {
      // Если нет в кэше, загружаем с сервера
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

          // Сохраняем в кэш
          StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);

          // Найти активную корзину
          this.activeBasket = this.baskets.find(
            (basket: any) => basket.isActiveBasket === true
          );

          // Если активной корзины нет, взять первую
          if (!this.activeBasket && this.baskets.length > 0) {
            this.activeBasket = this.baskets[0];
          }

          // Загрузить полную информацию об активной корзине
          if (this.activeBasket) {
            this.loadActiveBasket();
          }
        },
        error: (err) => {
          console.error('Ошибка загрузки корзин', err);
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
            // Обновляем кэш
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
          console.error('Ошибка загрузки корзины', err);
          this.error = 'Не удалось загрузить содержимое корзины.';
        }
      });
  }

  selectBasket(basket: UserBasket): void {
    if (this.activeBasket?.id === basket.id) return;

    this.activeBasket = basket;
    this.loadActiveBasket();

    // Обновляем активную корзину в кэше
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

    const dto: CreateBasketDto = {
      name,
      products: [],
    };

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

          // Обновляем кэш
          StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);

          this.closePopup();
          this.showNotification('Корзина успешно создана', 'success');
        },
        error: (err) => {
          console.error('Ошибка создания корзины', err);
          this.showNotification('Не удалось создать корзину', 'error');
        },
      });
  }

  private updateBasketName(name: string): void {
    if (!this.activeBasket) return;
    this.isPopupLoading = true;

    // TODO: Добавить API для обновления имени корзины
    // Пока обновляем локально
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

            // Обновляем кэш
            StorageUtils.setMemoryCache(memoryCacheEnvironment.baskets.key, this.baskets);

            this.showNotification('Корзина удалена', 'success');
          },
          error: (err) => {
            console.error('Ошибка удаления корзины', err);
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
          console.error('Ошибка дублирования корзины', err);
          this.showNotification('Не удалось продублировать корзину', 'error');
        }
      });
  }

  // Работа с товарами
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
            console.error(`Ошибка удаления товара ${productIds[index]}:`, err);
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

  onQuantityChange(event: { id: string; quantity: number }): void {
    if (!this.activeBasket?.products || !this.activeBasket.id) return;

    const product = this.activeBasket.products.find((p: any) => p.id === event.id);
    if (product) {
      product.count = event.quantity;
      this.calculateTotals();

      // Отправляем с дебаунсом для API
      this.quantityUpdate$.next({
        productId: product.product?.id,
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
          // this.selectedProducts.delete(id);
          this.loadActiveBasket(true);
          this.showNotification('Товар удален из корзины', 'success');
        },
        error: (err) => {
          console.error('Ошибка удаления товара', err);
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
          console.error('Ошибка добавления связанного товара', err);
          this.showNotification('Не удалось добавить товар', 'error');
        }
      });
  }

  // Фильтрация
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

  // Расчеты
  private calculateTotals(): void {
    if (!this.activeBasket?.products) {
      this.totalItems = 0;
      this.subtotal = 0;
      this.totalDiscount = 0;
      this.total = 0;
      return;
    }

    let items = 0;
    let subtotal = 0;
    let discount = 0;

    this.activeBasket.products.forEach((product: any) => {
      const count = product.count || 1;
      items += count;

      const originalPrice = product.product?.retailPrice || 0;
      const discountPercent = product.product?.discountPercentage || 0;
      const finalPrice = discountPercent > 0 ? originalPrice * (1 - discountPercent / 100) : originalPrice;

      subtotal += originalPrice * count;
      discount += (originalPrice - finalPrice) * count;
    });

    this.totalItems = items;
    this.subtotal = subtotal;
    this.totalDiscount = discount;
    this.total = subtotal - discount + this.deliveryCost;
  }

  // Промокод
  applyPromo(): void {
    if (!this.promoCode.trim()) return;

    // TODO: Проверка промокода через API
    this.appliedPromo = this.promoCode;
    this.promoCode = '';
    this.showPromo = false;

    // Временно добавим тестовую скидку
    this.totalDiscount += 100;
    this.calculateTotals();

    this.showNotification('Промокод применен!', 'success');
  }

  // Рекомендации
  private loadRecommendations(): void {
    // TODO: Загружать реальные рекомендации
    this.recommendedProducts = [
      { id: '1', name: 'Товар 1', price: 1990, image: '' },
      { id: '2', name: 'Товар 2', price: 2990, image: '' },
      { id: '3', name: 'Товар 3', price: 3990, image: '' },
      { id: '4', name: 'Товар 4', price: 4990, image: '' },
    ];
  }

  refreshRecommendations(): void {
    // Анимация обновления
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
          console.error('Ошибка добавления товара', err);
          this.showNotification('Не удалось добавить товар', 'error');
        }
      });
  }

  canProceedToCheckout(): boolean {
    return this.activeBasket?.products?.length > 0;
  }

  proceedToCheckout(): void {
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

  private cdr: any;
  setChangeDetectorRef(cdr: any): void {
    this.cdr = cdr;
  }

  goToCatalog(): void {
    this.router.navigate(['']);
  }
}