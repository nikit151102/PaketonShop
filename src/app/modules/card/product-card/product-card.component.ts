import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductGalleryComponent } from '../../../core/ui/product-gallery/product-gallery.component';
import { CleanArrayLinkPipe } from '../../../core/pipes/clear-url';
import { BasketsService } from '../../../core/api/baskets.service';
import { StorageUtils } from '../../../../utils/storage.utils';
import { localStorageEnvironment, memoryCacheEnvironment } from '../../../../environment';
import { take } from 'rxjs';
import { ProductFavoriteService } from '../../../core/api/product-favorite.service';
import { UserApiService } from '../../../core/api/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductsService } from '../../../core/services/products.service';
interface BreadCrumb {
  id: string;
  name: string;
  superCategoryId: string | null;
}

interface Basket {
  id: string;
  name: string;
  isActiveBasket?: boolean;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ProductGalleryComponent,
    CleanArrayLinkPipe,
  ],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
})
export class ProductCardComponent implements OnInit, OnChanges {
  @Input() productData!: any;
  @Input() breadCrumbs: BreadCrumb[] = [];

  selectedQuantity: number = 0;
  showAvailability: boolean = false;
  showBasketDetailsPopup: boolean = false;
  showBasketPopup: boolean = false;
  quantitySelectorVisible: boolean = false;

  filteredBaskets: any[] = [];
  basketSearchTerm: string = '';

  private userApiService = inject(UserApiService);

  constructor(
    private basketsService: BasketsService,
    private authService: AuthService,
    private productFavoriteService: ProductFavoriteService,
    private productsService: ProductsService
  ) { }

  ngOnInit() {
    this.initQuantity();
    this.checkProductInBaskets();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['productData']) {
      const currentValue = changes['productData'].currentValue;
      const previousValue = changes['productData'].previousValue;

      if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
        this.refreshProductData();
      }
      this.checkProductInBaskets();
    }
  }

  get activeBasketId(): string | null {
    const baskets: any = StorageUtils.getMemoryCache(
      memoryCacheEnvironment.baskets.key,
    );

    if (!baskets || !Array.isArray(baskets)) {
      return null;
    }

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

  validateQuantity(): void {
    // Сохраняем предыдущее значение для сравнения
    const previousQuantity = this.selectedQuantity;

    // Валидация минимального значения
    if (this.selectedQuantity < 1) {
      this.selectedQuantity = 1;
    }

    // Валидация максимального значения
    const maxQuantity = 9999; // или другое ограничение
    if (this.selectedQuantity > maxQuantity) {
      this.selectedQuantity = maxQuantity;
      this.showNotification(`Максимальное количество: ${maxQuantity}`, 'warning');
    }


  }

  // Проверяем, есть ли товар в активной корзине
  isInActiveBasket(): boolean {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.productData?.userBaskets) return false;

    return this.productData.userBaskets.some((item: any) =>
      item.userBasketId === activeBasketId
    );
  }

  // Расчет скидки (если есть)
  calculateDiscount(): number {
    if (!this.productData?.oldPrice) return 0;
    return Math.round((1 - this.productData.viewPrice / this.productData.oldPrice) * 100);
  }

  // Общая сумма всех корзин
  calculateTotalBasketsSum(): number {
    if (!this.productData?.userBaskets) return 0;
    return this.productData.userBaskets.reduce((sum: number, item: any) => sum + item.totalCost, 0);
  }

  // Получаем количество товара в активной корзине
  getActiveBasketCount(): number {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.productData?.userBaskets) return 0;

    const item = this.productData.userBaskets.find((item: any) =>
      item.userBasketId === activeBasketId
    );

    return item ? item.count : 0;
  }

  // Проверяем, есть ли товар в каких-либо корзинах
  hasProductInBaskets(): boolean {
    return this.productData?.userBaskets && this.productData.userBaskets.length > 0;
  }

  // Получаем общее количество товара во всех корзинах
  getTotalProductCount(): number {
    if (!this.productData?.userBaskets) return 0;
    return this.productData.userBaskets.reduce((total: any, item: any) => total + item.count, 0);
  }

  // Получаем информацию о корзинах, где есть товар
  getProductBaskets(): any[] {
    if (!this.productData?.userBaskets) return [];
    return this.productData.userBaskets;
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
      this.quantitySelectorVisible = true;
      this.selectedQuantity = this.getTotalProductCount();
    }
  }

  // Обновляем количество товара в активной корзине
  updateActiveBasketQty(delta: number): void {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId) return;

    const currentCount = this.getActiveBasketCount();
    const newCount = currentCount + delta;

    if (newCount <= 0) {
      this.removeFromBasket(activeBasketId);
      return;
    }

    // Используем changeProductFromBasket вместо addProduct
    this.basketsService
      .changeProductFromBasket(activeBasketId, this.productData.id, newCount)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
          this.userApiService.getOperativeInfo();
          this.showNotification('Количество обновлено', 'success');
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

    // Используем changeProductFromBasket вместо addProduct
    this.basketsService
      .changeProductFromBasket(activeBasketId, this.productData.id, value)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loadUpdatedProductData();
          this.userApiService.getOperativeInfo();
          this.showNotification('Количество обновлено', 'success');
        },
        error: (err) =>
          console.error('Ошибка при обновлении количества из поля ввода:', err),
      });
  }


  // Обновление количества в конкретной корзине
  updateBasketItemQuantity(basketId: string, delta: number): void {
    const item = this.getBasketItem(basketId);
    if (!item) return;

    const newCount = item.count + delta;

    if (newCount <= 0) {
      this.removeFromBasket(basketId);
      return;
    }

    // Используем changeProductFromBasket вместо addProduct
    this.basketsService.changeProductFromBasket(basketId, this.productData.id, newCount)
      .pipe(take(1)).subscribe({
        next: () => {
          this.loadUpdatedProductData();
          this.userApiService.getOperativeInfo();
          this.showNotification('Количество обновлено', 'success');
        },
        error: (err) => console.error('Ошибка при обновлении количества:', err)
      });
  }


  // Получить элемент корзины для конкретной корзины
  getBasketItem(basketId: string): any {
    if (!this.productData?.userBaskets) return null;
    return this.productData.userBaskets.find((item: any) => item.userBasketId === basketId);
  }

  // Проверить, есть ли товар в конкретной корзине
  isProductInBasket(basketId: string): boolean {
    return !!this.getBasketItem(basketId);
  }

  // Добавление в конкретную корзину
  addToSpecificBasket(basketId: string): void {
    const authToken = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.auth.key,
    );

    if (!authToken) {
      this.authService.changeVisible(true);
      return;
    }

    this.basketsService.addProduct({
      productId: this.productData.id,
      basketId: basketId,
      count: this.selectedQuantity
    }).pipe(take(1)).subscribe({
      next: () => {
        this.loadUpdatedProductData();
        this.userApiService.getOperativeInfo();
        this.showBasketPopup = false;
        this.showNotification('Товар добавлен в корзину', 'success');
      },
      error: (err) => console.error('Ошибка при добавлении в корзину:', err)
    });
  }

  // Удаление из конкретной корзины
  removeFromBasket(basketId: any): void {
    const basket = this.baskets?.find((b: any) => b.id === basketId);

    this.basketsService.changeProductFromBasket(basketId, this.productData.id, 0)
      .pipe(take(1)).subscribe({
        next: () => {
          this.loadUpdatedProductData();
          this.userApiService.getOperativeInfo();
          this.showNotification(`Товар удален из корзины "${basket?.name || ''}"`, 'success');
          if (basketId == this.activeBasketId) {
            this.selectedQuantity = 0;
          }
        },
        error: (err) => console.error('Ошибка при удалении из корзины:', err)
      });
  }

  // Создание новой корзины
  createNewBasket(): void {
    const basketName = prompt('Введите название новой корзины:', 'Новая корзина');
    if (!basketName) return;

    this.basketsService.createBasket({
      name: basketName,
      products: []
    }).subscribe({
      next: (newBasket) => {
        this.loadUpdatedProductData();
        this.showNotification(`Корзина "${basketName}" создана`, 'success');
      },
      error: (err) => console.error('Ошибка при создании корзины:', err)
    });
  }

  // Загружаем обновленные данные товара
  private loadUpdatedProductData(): void {
    this.productsService.getById(this.productData.id).subscribe((values: any) => {
      this.productData = values.data;
      setTimeout(() => {
        this.checkProductInBaskets();
      }, 100);
    });
  }

  increaseQty(): void {
    this.selectedQuantity++;
  }

  decreaseQty(): void {
    if (this.selectedQuantity > 1) {
      this.selectedQuantity--;
    }
  }

  getTotalPrice(): number {
    return (this.productData?.viewPrice || 0) * this.selectedQuantity;
  }

  getAvailableStoresCount(): number {
    if (!this.productData?.remains) return 0;
    return this.productData.remains.filter((store: any) => store.count > 0).length;
  }

  toggleAvailability(): void {
    this.showAvailability = !this.showAvailability;
  }

  toggleBasketPopup(event: MouseEvent): void {
    event.stopPropagation();
    this.showBasketPopup = !this.showBasketPopup;
  }

  closeBasketPopup(): void {
    this.showBasketPopup = false;
  }

  toggleBasketDetailsPopup(event: MouseEvent): void {
    event.stopPropagation();
    this.showBasketDetailsPopup = !this.showBasketDetailsPopup;
  }

  // Поиск корзин
  filterBaskets(event: any): void {
    this.basketSearchTerm = event.target.value.toLowerCase();
    this.filteredBaskets = this.baskets.filter((basket: any) =>
      basket.name.toLowerCase().includes(this.basketSearchTerm)
    );
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

  initQuantity() {
    if (this.productData?.packCount) {
      this.selectedQuantity = this.productData.packCount;
    }
  }

  copyArticle(): void {
    if (!this.productData?.article) return;

    navigator.clipboard.writeText(this.productData.article)
      .then(() => {
        this.showNotification('Артикул скопирован!', 'success');
      })
      .catch((err) => {
        console.error('Ошибка копирования:', err);
        this.showNotification('Не удалось скопировать артикул', 'error');
      });
  }

  toggleFavorite(): void {
    const authToken = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.auth.key,
    );

    if (!authToken) {
      this.authService.changeVisible(true);
      return;
    }

    this.productFavoriteService
      .addToFavorites(this.productData.id)
      .subscribe({
        next: (value: any) => {
          this.productData.isFavorite = !this.productData.isFavorite;
          this.userApiService.getOperativeInfo();
          this.showNotification(
            this.productData.isFavorite ? 'Товар добавлен в избранное' : 'Товар удален из избранного',
            'success'
          );
        },
        error: (error) => {
          console.error('Произошла ошибка:', error);
        }
      });
  }

  private refreshProductData(): void {
    setTimeout(() => {
      this.checkProductInBaskets();
      this.showBasketDetailsPopup = false;
    }, 100);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
      color: white;
      border-radius: 8px;
      z-index: 9999;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}