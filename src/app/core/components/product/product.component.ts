import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../location/location.service';
import { CleanStringLinkPipe } from '../../pipes/clear-url';
import { Product } from '../../../../models/product.interface';
import { Router } from '@angular/router';
import { ProductFavoriteService } from '../../api/product-favorite.service';
import { BasketsService } from '../../api/baskets.service';
import { StorageUtils } from '../../../../utils/storage.utils';
import { memoryCacheEnvironment } from '../../../../environment';
import { take } from 'rxjs';
import { ComparingService } from '../../api/comparing.service';
import { ProductsService } from '../../services/products.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-product',
  imports: [CommonModule, FormsModule, CleanStringLinkPipe],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
})
export class ProductComponent implements OnInit {
  @Input() view: 'compact' | 'wide' = 'compact';
  @Input() showCompare: boolean = true;
  @Input() product!: any;

  isUserBasket: boolean = false;
  city$!: typeof this.locationService.city$;
  inCart: boolean = false;
  hovered = true;
  showQuickView = false;
  selectedQuantity = 1;
  quantitySelectorVisible = false;
  showBasketDetailPopup = false;

  constructor(
    public locationService: LocationService,
    private router: Router,
    private productFavoriteService: ProductFavoriteService,
    private basketsService: BasketsService,
    private productsService: ProductsService,
    private comparingService: ComparingService,
    private authService:AuthService
  ) { }
  ngOnInit(): void {
    this.city$ = this.locationService.city$;
    this.checkProductInBaskets();
    this.filterBaskets 
  }

  private get activeBasketId(): string | null {
    const baskets: any = StorageUtils.getMemoryCache(
      memoryCacheEnvironment.baskets.key,
    );

    if (!baskets || !Array.isArray(baskets)) {
      this.isUserBasket = false;
      return null;
    }

    this.isUserBasket = true;
    const activeBasket = baskets.find(basket => basket.isActiveBasket === true);

    return activeBasket?.id ?? null;
  }

  public get baskets(): any | null {
    const baskets: any = StorageUtils.getMemoryCache(
      memoryCacheEnvironment.baskets.key,
    );
    this.filteredBaskets = baskets;
    return baskets;
  }

  // Проверяем, есть ли товар в активной корзине
  isInActiveBasket(): boolean {
    
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.product.userBaskets) return false;

    return this.product.userBaskets.some((item: any) =>
      item.userBasketId === activeBasketId
    );
  }

  // Получаем количество товара в активной корзине
  getActiveBasketCount(): number {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.product.userBaskets) return 0;

    const item = this.product.userBaskets.find((item: any) =>
      item.userBasketId === activeBasketId
    );

    return item ? item.count : 0;
  }

  // Получаем общую стоимость в активной корзине
  getActiveBasketTotal(): string {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.product.userBaskets) return '0';

    const item = this.product.userBaskets.find((item: any) =>
      item.userBasketId === activeBasketId
    );

    return item ? item.totalCost.toFixed(1) + ' ₽' : '0 ₽';
  }

  // Проверяем, есть ли товар в каких-либо корзинах
  hasProductInBaskets(): boolean {
    return this.product.userBaskets && this.product.userBaskets.length > 0;
  }

  // Получаем общее количество товара во всех корзинах
  getTotalProductCount(): number {
    if (!this.product.userBaskets) return 0;
    return this.product.userBaskets.reduce((total: any, item: any) => total + item.count, 0);
  }

  // Получаем информацию о корзинах, где есть товар
  getProductBaskets(): any[] {
    if (!this.product.userBaskets) return [];
    return this.product.userBaskets;
  }

  // Получаем название корзины по её ID
  getBasketName(basketId: string): string {
    const baskets = this.baskets;
    if (!baskets) return 'Корзина';
    const basket = baskets.find((b: any) => b.id === basketId);
    return basket?.name || 'Корзина';
  }

  // Проверяем наличие товара в корзинах и обновляем состояние
  private checkProductInBaskets(): void {
    if (this.hasProductInBaskets()) {
      this.inCart = true;
      this.quantitySelectorVisible = true;
      this.selectedQuantity = this.getTotalProductCount();
    }
  }

  showBasketPopup = false;

  toggleBasketPopup(event: MouseEvent): void {
    event.stopPropagation();
    this.showBasketPopup = !this.showBasketPopup;
  }


  // Добавляем товар в активную корзину
  addToActiveBasket(): void {

    if (this.isUserBasket == false) {
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

  // Обновляем количество товара в активной корзине
  updateActiveBasketQty(delta: number): void {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId) return;

    const currentCount = this.getActiveBasketCount();
    const newCount = currentCount + delta;

    if (newCount <= 0) {
      // Удаляем из активной корзины
      this.removeFromSpecificBasket({ userBasketId: activeBasketId });
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

  // Обновляем количество из поля ввода
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

  // Обновляем количество товара в конкретной корзине
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

  // Удаляем товар из конкретной корзины
  removeFromSpecificBasket(basketItem: any): void {
    this.basketsService
      .removeProduct({
        productId: this.product.id,
        basketId: basketItem.userBasketId,
        count: 0
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
        },
        error: (err) =>
          console.error('Ошибка при удалении товара из корзины:', err),
      });
  }

  // Загружаем обновленные данные товара
  private loadUpdatedProductData(): void {
    this.productsService.getById(this.product.id).subscribe((values: any) => {
      this.product = values.data;
    });
    setTimeout(() => {
      this.checkProductInBaskets();
      this.hideBasketDetails();
    }, 300);
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
    return totalPrice.toFixed(1);
  }

  private updateBasket(count: number): void {
    const basketId = this.activeBasketId;
    if (!basketId) return console.error('Корзина не найдена');

    this.basketsService
      .addProduct({ productId: this.product.id, basketId, count })
      .pipe(take(1))
      .subscribe({
        next: () => {
          // Не устанавливаем selectedQuantity = count, потому что это количество для добавления
          // selectedQuantity должен быть 1 при добавлении нового товара
          this.selectedQuantity = 1; // Сбрасываем к 1
          this.inCart = true;
          this.quantitySelectorVisible = true;
          this.loadUpdatedProductData();
        },
        error: (err) => console.error('Ошибка при обновлении корзины', err),
      });
  }

  // Добавить 1 товар
  addOneToCart(): void {

    if (this.isUserBasket == false) {
      return;
    }

    const basketId = this.activeBasketId;
    if (!basketId) return console.error('Корзина не найдена');

    this.basketsService
      .addProduct({ productId: this.product.id, basketId, count: 1 })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
        },
        error: (err) => console.error('Ошибка при добавлении товара', err),
      });
  }

  // Установить точное количество
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
      // Если товар уже в корзине, увеличиваем количество на 1
      this.updateActiveBasketQty(1);
    } else {
      // Если товара нет в корзине, добавляем 1 штуку
      this.updateBasket(1);
    }
  }

  decreaseQty(): void {
    const newQty = this.selectedQuantity - 1;
    if (newQty <= 0) return this.removeFromBasket();
    this.updateBasket(newQty);
  }

  removeFromBasket(): void {
    const basketId = this.activeBasketId;
    if (!basketId) return;

    this.basketsService
      .removeProduct({ productId: this.product.id, basketId, count: 0 })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.inCart = false;
          this.selectedQuantity = 1;
          this.quantitySelectorVisible = false;
          this.loadUpdatedProductData();
        },
        error: (err) => console.error('Ошибка при удалении товара', err),
      });
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

 toggleFavorite(event: MouseEvent) {
  event.stopImmediatePropagation();
  event.preventDefault();
  
  this.productFavoriteService
    .addToFavorites(this.product.id)
    .subscribe({
      next: (value: any) => {
        console.log('Добавлено в избранное:', value);
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

  toggleCompare(event: MouseEvent) {
    event.stopImmediatePropagation();
    event.preventDefault();

    const serviceCall = this.product.compareProduct
      ? this.comparingService.deleteCompareProduct(this.product.id)
      : this.comparingService.setCompareProduct(this.product.id);

    serviceCall.subscribe({
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











    // baskets: any[] = [];
  filteredBaskets: any[] = [];
  selectedBasketId: string | null = null;
  // showBasketPopup = false;
  // showBasketDetailPopup = false;
  currentProduct: any = null;

  // Поиск корзин
  filterBaskets(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredBaskets = this.baskets.filter((basket: any) => 
      basket.name.toLowerCase().includes(searchTerm)
    );
  }

  // Выбор корзины
  selectBasket(basket: any) {
    this.selectedBasketId = basket.id;
    console.log('Выбрана корзина:', basket);
    // Здесь ваш код добавления товара в корзину
    this.closeBasketPopup();
    
    // Показываем уведомление об успехе
    this.showSuccessNotification(`Товар добавлен в "${basket.name}"`);
  }

  // Показать детали корзины
  showBasketDetails(event: Event, basket: any) {
    event.stopPropagation();
    // this.currentProduct = this.getCurrentProduct(); // Получите текущий товар
    this.showBasketDetailPopup = true;
    this.showBasketPopup = false;
  }

  // Создать новую корзину
  createNewBasket() {
    console.log('Создание новой корзины');
    // Здесь ваш код создания корзины
    this.closeBasketPopup();
  }

  // Уведомление об успехе
  showSuccessNotification(message: string) {
    // Используйте ваш компонент уведомлений или простой alert
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

  // Закрытие попапов
  closeBasketPopup() {
    this.showBasketPopup = false;
    document.body.style.overflow = 'auto';
  }

  hideBasketDetails() {
    this.showBasketDetailPopup = false;
    document.body.style.overflow = 'auto';
  }
}