import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, OnInit, Output, ChangeDetectorRef, OnDestroy, SimpleChanges, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../location/location.service';
import { CleanStringLinkPipe } from '../../pipes/clear-url';
import { Router } from '@angular/router';
import { ProductFavoriteService } from '../../api/product-favorite.service';
import { BasketsService } from '../../api/baskets.service';
import { StorageUtils } from '../../../../utils/storage.utils';
import { localStorageEnvironment, memoryCacheEnvironment } from '../../../../environment';
import { Subject, take, takeUntil } from 'rxjs';
import { ComparingService } from '../../api/comparing.service';
import { ProductsService } from '../../services/products.service';
import { AuthService } from '../../services/auth.service';
import { UserApiService } from '../../api/user.service';
import { BasketManagerModalComponent } from '../basket-manager-modal/basket-manager-modal.component';
import { UserService } from '../../services/user.service';
import { BasketsStateService } from '../../services/baskets-state.service';

@Component({
  selector: 'app-product',
  imports: [CommonModule, FormsModule, CleanStringLinkPipe, BasketManagerModalComponent],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
})
export class ProductComponent implements OnInit, OnDestroy {
  @Input() view: 'compact' | 'wide' = 'compact';
  @Input() showCompare: boolean = true;
  @Input() product!: any;

  @Output() onFavoriteRemoved = new EventEmitter<{ productId: string, product: any, undo: () => void }>();

  isUserBasket: boolean = false;
  city$!: typeof this.locationService.city$;
  inCart: boolean = false;
  hovered = true;
  showQuickView = false;
  selectedQuantity = 1;
  quantitySelectorVisible = false;
  showBasketDetailPopup = false;
  isRedirecting = computed(() => this.authService.isRedirectingToProfile())

  // Для шаблона
  hasBaskets: boolean = false;
  productBasketsCount: number = 0;
  filteredBaskets: any[] = [];
  basketSearchTerm: string = '';
  selectedBasketId: string | null = null;

  // Данные корзин из сервиса
  basketsData: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    public locationService: LocationService,
    private router: Router,
    private productFavoriteService: ProductFavoriteService,
    private basketsService: BasketsService,
    private productsService: ProductsService,
    private comparingService: ComparingService,
    private authService: AuthService,
    private userService: UserService,
    private basketsStateService: BasketsStateService,
    private cdr: ChangeDetectorRef,
  ) {
    // Эффект для отслеживания изменений авторизации
    effect(() => {
      const isAuth = this.userService.authUser();
      if (this.product?.id && isAuth) {
        this.refreshProductBasketsInfo();
      }
      this.updateProductState();
    });
  }

  private userApiService = inject(UserApiService);

  ngOnInit(): void {
    this.city$ = this.locationService.city$;

    // ПОДПИСЫВАЕМСЯ НА ИЗМЕНЕНИЯ КОРЗИН - УБИРАЕМ take(1)
    this.basketsStateService.baskets$
      .pipe(takeUntil(this.destroy$))
      .subscribe(baskets => {
        console.log('ProductComponent: получены новые корзины', baskets);
        this.basketsData = baskets || [];
        this.updateProductState();
        // Принудительно обновляем UI
        this.cdr.detectChanges();
      });

    this.updateProductState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Обновляем состояние при изменении входных данных
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product']) {
      this.updateProductState();
    }
  }

  /**
   * Обновляет информацию о корзинах в продукте
   */
  private refreshProductBasketsInfo(): void {
    if (!this.product?.id) return;

    this.productsService.getById(this.product.id).pipe(take(1)).subscribe({
      next: (response: any) => {
        if (response?.data) {
          this.product.userBaskets = response.data.userBaskets;
          this.updateProductState();
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Ошибка обновления продукта:', err);
      }
    });
  }

  private updateProductState(): void {
    // Обновляем данные корзин из сервиса
    const baskets = this.basketsStateService.getCurrentBaskets() || [];
    this.basketsData = baskets;
    this.hasBaskets = baskets.length > 0;
    this.isUserBasket = baskets.length > 0 && this.userService.authUser();
    this.productBasketsCount = this.getProductBaskets().length;
    this.checkProductInBaskets();
    this.filteredBaskets = [...baskets]; // Создаем новую ссылку для триггера
  }

  private get activeBasketId(): string | null {
    if (!this.userService.authUser()) return null;

    const baskets = this.basketsStateService.getCurrentBaskets();
    if (!baskets || !Array.isArray(baskets) || baskets.length === 0) {
      return null;
    }

    const activeBasket = baskets.find(basket => basket.isActiveBasket === true);
    return activeBasket?.id ?? null;
  }

  isInActiveBasket(): boolean {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.product.userBaskets) return false;

    return this.product.userBaskets.some((item: any) =>
      item.userBasketId === activeBasketId
    );
  }

  getActiveBasketCount(): number {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.product.userBaskets) return 0;

    const item = this.product.userBaskets.find((item: any) =>
      item.userBasketId === activeBasketId
    );

    return item ? item.count : 0;
  }

  getActiveBasketTotal(): string {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.product.userBaskets) return '0';

    const item = this.product.userBaskets.find((item: any) =>
      item.userBasketId === activeBasketId
    );

    return item ? item.totalCost.toFixed(1) + ' ₽' : '0 ₽';
  }

  hasProductInBaskets(): boolean {
    return this.product.userBaskets && this.product.userBaskets.length > 0;
  }

  getTotalProductCount(): number {
    if (!this.product.userBaskets) return 0;
    return this.product.userBaskets.reduce((total: any, item: any) => total + item.count, 0);
  }

  getProductBaskets(): any[] {
    if (!this.product.userBaskets) return [];
    return this.product.userBaskets;
  }

  getBasketName(basketId: string): string {
    const baskets = this.basketsStateService.getCurrentBaskets();
    if (!baskets || baskets.length === 0) return 'Корзина';
    const basket = baskets.find((b: any) => b.id === basketId);
    return basket?.name || 'Корзина';
  }

  private checkProductInBaskets(): void {
    const hasProducts = this.hasProductInBaskets();

    if (hasProducts) {
      this.inCart = true;
      this.quantitySelectorVisible = true;
      this.selectedQuantity = this.getTotalProductCount();
    } else {
      this.inCart = false;
      this.quantitySelectorVisible = false;
      this.selectedQuantity = 1;
    }
  }

  toggleBasketPopup(event: MouseEvent): void {
    event.stopPropagation();
    this.showBasketPopup = !this.showBasketPopup;
    if (this.showBasketPopup) {
      const baskets = this.basketsStateService.getCurrentBaskets();
      this.filteredBaskets = baskets || [];
      this.basketSearchTerm = '';
    }
  }

  addToActiveBasket(): void {
    if (this.isUserBasket == false) {
      this.authService.changeVisible(true);
      return;
    }

    const activeBasketId = this.activeBasketId;
    if (!activeBasketId) {
      console.error('Активная корзина не найдена');
      return;
    }

    this.basketsService
      .addProduct({
        productId: this.product.id,
        basketId: activeBasketId,
        count: this.selectedQuantity
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
        },
        error: (err) =>
          console.error('Ошибка при добавлении в активную корзину:', err),
      });
  }

  updateActiveBasketQty(delta: number): void {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId) return;

    const currentCount = this.getActiveBasketCount();
    const newCount = currentCount + delta;

    if (newCount <= 0) {
      this.basketsService
        .changeProductFromBasket(activeBasketId, this.product.id, 0)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.loadUpdatedProductData();
            this.inCart = false;
            this.quantitySelectorVisible = false;
            this.selectedQuantity = 1;
          },
          error: (err) => console.error('Ошибка при удалении товара из корзины:', err),
        });
      return;
    }

    this.basketsService
      .addProduct({
        productId: this.product.id,
        basketId: activeBasketId,
        count: newCount
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
        },
        error: (err) =>
          console.error('Ошибка при обновлении количества в активной корзине:', err),
      });
  }

  updateActiveBasketQtyFromInput(event: any): void {
    const value = parseInt(event.target.value, 10);
    if (isNaN(value) || value < 1) return;

    const activeBasketId = this.activeBasketId;
    if (!activeBasketId) return;

    this.basketsService
      .addProduct({
        productId: this.product.id,
        basketId: activeBasketId,
        count: value
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
        },
        error: (err) =>
          console.error('Ошибка при обновлении количества из поля ввода:', err),
      });
  }

  updateBasketItem(basketItem: any, delta: number): void {
    const newCount = basketItem.count + delta;
    if (newCount <= 0) {
      this.removeFromSpecificBasket(basketItem);
      return;
    }

    this.basketsService
      .addProduct({
        productId: this.product.id,
        basketId: basketItem.userBasketId,
        count: newCount
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
        },
        error: (err) =>
          console.error('Ошибка при обновлении количества:', err),
      });
  }

  removeFromSpecificBasket(basketItem: any): void {
    this.basketsService
      .changeProductFromBasket(basketItem.userBasketId, this.product.id, 0)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
          if (basketItem.userBasketId === this.activeBasketId) {
            this.inCart = false;
            this.quantitySelectorVisible = false;
            this.selectedQuantity = 1;
          }
        },
        error: (err) =>
          console.error('Ошибка при удалении товара из корзины:', err),
      });
  }

  private loadUpdatedProductData(): void {
    this.productsService.getById(this.product.id).pipe(take(1)).subscribe((values: any) => {
      this.product = values.data;
      this.updateProductState();
      this.hideBasketDetails();
      this.cdr.detectChanges();
    });
  }

  getPrice(city: any | null): number {
    if (city === 'Барнаул') {
      return this.product.retailPrice;
    } else {
      return this.product.wholesalePrice;
    }
  }

  getTotalPrice(city: any): string {
    const totalPrice = this.getPrice(city) * this.selectedQuantity;
    return totalPrice.toFixed(3);
  }

  private updateBasket(count: number): void {
    const basketId = this.activeBasketId;
    if (!basketId) return console.error('Корзина не найдена');

    this.basketsService
      .addProduct({ productId: this.product.id, basketId, count })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.selectedQuantity = 1;
          this.inCart = true;
          this.quantitySelectorVisible = true;
          this.loadUpdatedProductData();
        },
        error: (err) => console.error('Ошибка при обновлении корзины', err),
      });
  }

  addOneToCart(): void {
    const authToken = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.auth.key,
    );

    if (!authToken) {
      this.authService.setRedirectingToProfile(false);
      this.authService.changeVisible(true);
      return;
    }

    if (this.isUserBasket == false) {
      this.authService.changeVisible(true);
      return;
    }

    const basketId = this.activeBasketId;
    if (!basketId) return;

    this.basketsService
      .addProduct({ productId: this.product.id, basketId, count: 1 })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
          this.userApiService.getOperativeInfo();
        },
        error: (err) => console.error('Ошибка при добавлении товара', err),
      });
  }

  setExactQuantity(quantity: number): void {
    const basketId = this.activeBasketId;
    if (!basketId || quantity <= 0) return;

    this.basketsService
      .addProduct({ productId: this.product.id, basketId, count: quantity })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
        },
        error: (err) => console.error('Ошибка при установке количества', err),
      });
  }

  increaseQty(): void {
    if (this.hasProductInBaskets()) {
      this.updateActiveBasketQty(1);
    } else {
      this.updateBasket(1);
    }
  }

  decreaseQty(): void {
    const newQty = this.selectedQuantity - 1;
    if (newQty <= 0) return;
    this.updateBasket(newQty);
  }

  addToCart(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.updateBasket(1);
  }

  toggleQuantitySelector(): void {
    this.updateBasket(1);
  }

  onProductClick(event: MouseEvent): void {
    const excluded = [
      'add-cart',
      'confirm-quantity',
      'input-quantity',
      'quantity-btn',
      'quick-view',
      'basket-summary',
      'basket-details',
      'mini-btn',
      'close-details',
      'baskets-count'
    ];
    const target = event.target as HTMLElement;
    if (excluded.some((cls) => target.closest(`.${cls}`))) {
      event.stopPropagation();
      return;
    }

    this.router.navigate(['/product', this.product.id]);
  }

  toggleFavorite(event: MouseEvent, isFavorite: boolean) {
    event.stopImmediatePropagation();
    event.preventDefault();

    if (isFavorite) {
      this.productFavoriteService
        .removeFromFavorites(this.product.id)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.userApiService.getOperativeInfo();
            this.product.isFavorite = false;
          },
          error: (error) => {
            if (error.status === 401) {
              console.error('Пользователь не авторизован');
              this.authService.changeVisible(true);
            } else {
              console.error('Произошла ошибка:', error);
            }
          }
        });
    } else {
      this.productFavoriteService
        .addToFavorites(this.product.id)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.product.isFavorite = true;
            this.userApiService.getOperativeInfo();
          },
          error: (error) => {
            if (error.status === 401) {
              console.error('Пользователь не авторизован');
              this.authService.changeVisible(true);
            } else {
              console.error('Произошла ошибка:', error);
            }
          }
        });
    }
  }

  toggleCompare(event: MouseEvent) {
    event.stopImmediatePropagation();
    event.preventDefault();

    const serviceCall = this.product.compareProduct
      ? this.comparingService.deleteCompareProduct(this.product.id)
      : this.comparingService.setCompareProduct(this.product.id);

    serviceCall.pipe(take(1)).subscribe({
      next: () => this.product.compareProduct = !this.product.compareProduct,
      error: (error) => {
        if (error.status === 401) {
          console.error('Пользователь не авторизован');
          this.authService.changeVisible(true);
        } else {
          console.error('Произошла ошибка:', error);
        }
      }
    });
  }

  openQuickView() {
    this.showQuickView = true;
  }

  closeQuickView() {
    this.showQuickView = false;
  }

  showBasketPopup = false;

  showBasketDetails(event: Event, basket: any) {
    event.stopPropagation();
    this.showBasketDetailPopup = true;
    this.showBasketPopup = false;
  }

  showSuccessNotification(message: string) {
    const notification = document.createElement('div');
    notification.className = 'success-toast';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary-color);
      color: white;
      padding: 12px 24px;
      border-radius: 30px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 2000;
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  hideBasketDetails() {
    this.showBasketDetailPopup = false;
    document.body.style.overflow = 'auto';
  }

  get sortedBaskets(): any[] {
    if (!this.filteredBaskets) return [];

    return [...this.filteredBaskets].sort((a, b) => {
      if (a.isActiveBasket && !b.isActiveBasket) return -1;
      if (!a.isActiveBasket && b.isActiveBasket) return 1;

      const aHasProduct = this.isProductInBasket(a.id);
      const bHasProduct = this.isProductInBasket(b.id);

      if (aHasProduct && !bHasProduct) return -1;
      if (!aHasProduct && bHasProduct) return 1;

      return a.name.localeCompare(b.name);
    });
  }

  getBasketItem(basketId: string): any {
    if (!this.product?.userBaskets) return null;
    return this.product.userBaskets.find((item: any) => item.userBasketId === basketId);
  }

  isProductInBasket(basketId: string): boolean {
    return !!this.getBasketItem(basketId);
  }

  filterBaskets(event: any): void {
    this.basketSearchTerm = event.target.value.toLowerCase();
    const baskets = this.basketsStateService.getCurrentBaskets();
    if (baskets && baskets.length > 0) {
      this.filteredBaskets = baskets.filter((basket: any) =>
        basket.name.toLowerCase().includes(this.basketSearchTerm)
      );
    }
  }

  selectBasket(basket: any): void {
    if (basket.isActiveBasket) return;
  }

  updateBasketItemQuantity(basketId: string, delta: number): void {
    const item = this.getBasketItem(basketId);
    if (!item) return;

    const newCount = item.count + delta;
    if (newCount <= 0) {
      this.removeFromBasket(basketId);
      return;
    }

    this.basketsService.addProduct({
      productId: this.product.id,
      basketId: basketId,
      count: newCount
    }).pipe(take(1)).subscribe({
      next: () => this.loadUpdatedProductData(),
      error: (err) => console.error('Ошибка при обновлении количества:', err)
    });
  }

  updateBasketItemQuantityFromInput(basketId: string, event: any): void {
    const value = parseInt(event.target.value, 10);
    if (isNaN(value) || value < 1) return;

    this.basketsService.addProduct({
      productId: this.product.id,
      basketId: basketId,
      count: value
    }).pipe(take(1)).subscribe({
      next: () => this.loadUpdatedProductData(),
      error: (err) => console.error('Ошибка при обновлении количества:', err)
    });
  }

  addToSpecificBasket(basketId: string): void {
    this.basketsService.addProduct({
      productId: this.product.id,
      basketId: basketId,
      count: 1
    }).pipe(take(1)).subscribe({
      next: () => {
        this.loadUpdatedProductData();

        this.showNotification('Товар добавлен в корзину');
      },
      error: (err) => console.error('Ошибка при добавлении в корзину:', err)
    });
  }

  private loadBaskets(): void {
    this.basketsService.filterBaskets({ filters: [], sorts: [], page: 0, pageSize: 10 })
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.basketsStateService.updateBaskets(res.data);
        },
        error: (err) => console.error('Ошибка загрузки корзин', err)
      });
  }
  
  removeFromBasket(basketId: string): void {
    const baskets = this.basketsStateService.getCurrentBaskets();
    const basket = baskets?.find((b: any) => b.id === basketId);

    this.basketsService.changeProductFromBasket(basketId, this.product.id, 0).pipe(take(1)).subscribe({
      next: () => {
        this.loadUpdatedProductData();
        this.showNotification(`Товар удален из корзины "${basket?.name || ''}"`);
      },
      error: (err) => console.error('Ошибка при удалении из корзины:', err)
    });
  }

  createNewBasket(): void {
    const basketName = prompt('Введите название новой корзины:', 'Новая корзина');
    if (!basketName) return;

    this.basketsService.createBasket({
      name: basketName,
      products: []
    }).pipe(take(1)).subscribe({
      next: () => {
        this.loadUpdatedProductData();
        this.loadBaskets();
        this.showNotification(`Корзина "${basketName}" создана`);
      },
      error: (err) => console.error('Ошибка при создании корзины:', err)
    });
  }

  private showNotification(message: string): void { }

  closeBasketPopup(): void {
    this.showBasketPopup = false;
    this.basketSearchTerm = '';
    const baskets = this.basketsStateService.getCurrentBaskets();
    if (baskets && baskets.length > 0) {
      this.filteredBaskets = baskets;
    }
    document.body.style.overflow = 'auto';
  }

  onSearchChange(term: string) {
    this.basketSearchTerm = term;
  }

  onSelectBasket(basket: any) {
    this.selectBasket(basket);
  }

  onAddToBasket(basketId: string) {
    this.addToSpecificBasket(basketId);
  }

  onRemoveFromBasket(basketId: string) {
    this.removeFromBasket(basketId);
  }

  onUpdateQuantity(event: { basketId: string, delta: number }) {
    this.updateBasketItemQuantity(event.basketId, event.delta);
  }

  onUpdateQuantityFromInput(event: { basketId: string, value: string }) {
    this.updateBasketItemQuantityFromInput(event.basketId, { target: { value: event.value } });
  }

  onCreateBasket() {
    this.createNewBasket();
  }

  closeBasketManager() {
    this.showBasketPopup = false;
    this.basketSearchTerm = '';
    document.body.style.overflow = 'auto';
  }
}