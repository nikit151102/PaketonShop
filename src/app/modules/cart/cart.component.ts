import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductComponent } from './product/product.component';
import { SelectCartButtonComponent } from './select-cart-button/select-cart-button.component';
import { BasketsService } from '../../core/api/baskets.service';
import { UserBasket, CreateBasketDto } from '../../../models/baskets.interface';
import { DeliveryOrderService } from '../../core/api/delivery-order.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ProductComponent,
    SelectCartButtonComponent,
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
  error: string | null = null;
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
  private quantityUpdate$ = new Subject<{ id: string; quantity: number }>();

  constructor(
    private basketsService: BasketsService,
    private deliveryOrderService: DeliveryOrderService,
    public router: Router,
  ) {
    // Дебаунс для обновления количества
    this.quantityUpdate$
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe((event) => {
        this.updateQuantityApi(event.id, event.quantity);
      });
  }

  ngOnInit(): void {
    this.loadBaskets();
    this.loadRecommendations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      .subscribe({
        next: (res) => {
          this.baskets = res.data;

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
            this.selectBasket(this.activeBasket);
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Ошибка загрузки корзин', err);
          this.error = 'Не удалось загрузить корзины. Пожалуйста, попробуйте позже.';
          this.isLoading = false;
        },
      });
  }

  selectBasket(basket: UserBasket): void {
    this.isLoading = true;
    
    this.basketsService.getBasketById(basket.id).subscribe({
      next: (value: any) => {
        this.activeBasket = value.data;
        this.selectedProducts.clear();
        this.calculateTotals();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки корзины', err);
        this.error = 'Не удалось загрузить содержимое корзины.';
        this.isLoading = false;
      }
    });
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
    const dto: CreateBasketDto = {
      name,
      products: [],
    };

    this.basketsService.createBasket(dto).subscribe({
      next: (res) => {
        this.baskets.push(res.data);
        this.activeBasket = res.data;
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

    // TODO: Добавить API для обновления имени корзины
    this.activeBasket.name = name;
    const basketIndex = this.baskets.findIndex(b => b.id === this.activeBasket.id);
    if (basketIndex !== -1) {
      this.baskets[basketIndex].name = name;
    }
    
    this.closePopup();
    this.showNotification('Название корзины обновлено', 'success');
  }

  deleteBasket(basket: any, event: Event): void {
    event.stopPropagation();
    
    if (this.baskets.length <= 1) {
      this.showNotification('Нельзя удалить последнюю корзину', 'warning');
      return;
    }

    if (confirm(`Удалить корзину "${basket.name}"?`)) {
      // TODO: Добавить API удаления корзины
      this.baskets = this.baskets.filter(b => b.id !== basket.id);
      
      if (this.activeBasket?.id === basket.id) {
        this.activeBasket = this.baskets[0];
        this.selectBasket(this.activeBasket);
      }
      
      this.showNotification('Корзина удалена', 'success');
    }
  }

  duplicateBasket(): void {
    if (!this.activeBasket) return;

    const newBasket = {
      ...this.activeBasket,
      id: undefined,
      name: `${this.activeBasket.name} (копия)`,
    };

    // TODO: Добавить API дублирования корзины
    this.baskets.push(newBasket);
    this.activeBasket = newBasket;
    this.showNotification('Корзина продублирована', 'success');
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

    // TODO: Добавить API вызова для удаления нескольких товаров
    if (this.activeBasket?.products) {
      this.activeBasket.products = this.activeBasket.products.filter(
        (p: any) => !productIds.includes(p.id)
      );
    }

    this.selectedProducts.clear();
    this.calculateTotals();
    this.showNotification(`${productIds.length} товаров удалено`, 'success');
  }

  onQuantityChange(event: { id: string; quantity: number }): void {
    if (!this.activeBasket?.products) return;

    const product = this.activeBasket.products.find((p: any) => p.id === event.id);
    if (product) {
      product.count = event.quantity;
      this.calculateTotals();
      
      // Отправляем с дебаунсом для API
      this.quantityUpdate$.next(event);
    }
  }

  private updateQuantityApi(id: string, quantity: number): void {
    // TODO: Добавить реальный API вызов
    console.log(`API: Обновление количества товара ${id} до ${quantity}`);
  }

  onProductRemove(id: string): void {
    if (!this.activeBasket?.products) return;

    this.activeBasket.products = this.activeBasket.products.filter(
      (p: any) => p.id !== id
    );

    this.selectedProducts.delete(id);
    this.calculateTotals();

    // TODO: Добавить API удаления товара
    console.log(`Удален товар с ID: ${id}`);
    this.showNotification('Товар удален из корзины', 'success');
  }

  onQuickView(product: any): void {
    this.quickViewProduct = product;
  }

  closeQuickView(): void {
    this.quickViewProduct = null;
  }

  onAddRelated(item: any): void {
    // TODO: Добавить связанный товар в корзину
    console.log('Добавлен связанный товар:', item);
    this.showNotification('Товар добавлен в корзину', 'success');
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
    // TODO: Добавить товар в корзину
    console.log('Добавлен рекомендуемый товар:', item);
    this.showNotification('Товар добавлен в корзину', 'success');
  }

  // Оформление заказа
  canProceedToCheckout(): boolean {
    return this.activeBasket?.products?.length > 0;
  }

  proceedToCheckout(): void {
    if (!this.canProceedToCheckout()) {
      this.showNotification('Добавьте товары в корзину', 'warning');
      return;
    }

    this.step = 2;
    // Плавный скролл к верху
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // TODO: Переход к оформлению
    // const productPositionIds = this.activeBasket.products.map((product:any) => product.id);
    // this.deliveryOrderService.createOrder({
    //   'userBasketId': this.activeBasket.id,
    //   'orderStatus': 0,
    //   'productPositionIds': productPositionIds
    // }).subscribe((response: any) => {
    //   this.router.navigate(['/order', response.data.id]);
    // });
  }

  // Доставка
  toggleDeliveryInfo(): void {
    this.deliveryInfoOpen = !this.deliveryInfoOpen;
  }

  // Чат поддержки
  openChat(): void {
    console.log('Открыть чат поддержки');
    // TODO: Открыть чат
  }

  // Уведомления
  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    // TODO: Реализовать систему уведомлений
    console.log(`[${type}] ${message}`);
  }

  // TrackBy для оптимизации
  trackByProductId(index: number, item: any): string {
    return item.id;
  }

  trackByBasketId(index: number, item: any): string {
    return item.id;
  }
}