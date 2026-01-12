import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductGalleryComponent } from '../../../core/ui/product-gallery/product-gallery.component';
import { CleanArrayLinkPipe } from '../../../core/pipes/clear-url';
import { Product } from '../../../../models/product.interface';
import { BasketsService } from '../../../core/api/baskets.service';
import { StorageUtils } from '../../../../utils/storage.utils';
import { memoryCacheEnvironment } from '../../../../environment';
import { take } from 'rxjs';

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

interface BasketItem {
  userBasketId: string;
  count: number;
  totalCost: number;
  userBasketName?: string;
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
export class ProductCardComponent implements OnInit, OnDestroy, OnChanges  {
  @Input() productData!: any;
  @Input() breadCrumbs: BreadCrumb[] = [];
  
  selectedQuantity: number = 1;
  showAvailability: boolean = false;
  showQuantityControls: boolean = false;
  showBasketPopup: boolean = false;
  showBasketDetailsPopup: boolean = false;
  
  private minQuantity: number = 1;
  private maxQuantity: number = 1000;
  private inCartBaskets: Map<string, number> = new Map(); // basketId -> quantity

  constructor(private basketsService: BasketsService) {}

  ngOnInit() {
    this.initQuantity();
    this.checkProductInBaskets();
  }
  
    ngOnChanges(changes: SimpleChanges) {
    if (changes['productData']) {
      console.log('Product data changed:', changes['productData']);
      
      const currentValue = changes['productData'].currentValue;
      const previousValue = changes['productData'].previousValue;
      
      if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
        this.refreshProductData();
      }
          this.checkProductInBaskets();
    }
  }

  ngOnDestroy() {
    // Очистка подписок если будут
  }

  // Проверяем, в каких корзинах уже есть товар
  private checkProductInBaskets() {
    console.log('his.productData',this.productData)
    if (!this.productData?.userBaskets || !Array.isArray(this.productData.userBaskets)) {
      return;
    }

    // Заполняем карту корзин с товаром
    this.productData.userBaskets.forEach((item: BasketItem) => {
      this.inCartBaskets.set(item.userBasketId, item.count);
    });

    // Проверяем, есть ли товар в активной корзине
    const activeBasketId = this.activeBasketId;
    if (activeBasketId && this.inCartBaskets.has(activeBasketId)) {
      this.showQuantityControls = true;
      this.selectedQuantity = this.inCartBaskets.get(activeBasketId) || this.minQuantity;
    }
  }

  // Проверяем, есть ли товар в активной корзине
  get isInActiveBasket(): boolean {
    const activeBasketId = this.activeBasketId;
    return activeBasketId ? this.inCartBaskets.has(activeBasketId) : false;
  }

  // Получаем количество в активной корзине
  get activeBasketQuantity(): number {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId) return 0;
    return this.inCartBaskets.get(activeBasketId) || 0;
  }

  // Проверяем, есть ли товар в других корзинах
  get isInOtherBaskets(): boolean {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId) return this.inCartBaskets.size > 0;
    return Array.from(this.inCartBaskets.keys()).some(id => id !== activeBasketId);
  }

  // Получаем список корзин с товаром
  get basketsWithProduct(): Array<{basket: Basket, quantity: number, totalCost: number}> {
    const allBaskets = this.baskets || [];
    const result: Array<{basket: Basket, quantity: number, totalCost: number}> = [];
    
    allBaskets.forEach(basket => {
      const quantity = this.inCartBaskets.get(basket.id);
      if (quantity) {
        const basketItem = this.productData.userBaskets?.find((item: BasketItem) => 
          item.userBasketId === basket.id
        );
        result.push({
          basket,
          quantity,
          totalCost: basketItem?.totalCost || 0
        });
      }
    });
    
    return result;
  }

  // Получаем общее количество товара во всех корзинах
  get totalQuantityInBaskets(): number {
    return Array.from(this.inCartBaskets.values()).reduce((sum, qty) => sum + qty, 0);
  }

  // Получаем активную корзину
  private get activeBasketId(): string | null {
    const baskets: Basket[] = StorageUtils.getMemoryCache(
      memoryCacheEnvironment.baskets.key,
    ) || [];

    const activeBasket = baskets.find(basket => basket.isActiveBasket === true);
    return activeBasket?.id ?? null;
  }

  // Получаем все корзины
  public get baskets(): Basket[] | null {
    return StorageUtils.getMemoryCache(memoryCacheEnvironment.baskets.key) || [];
  }

  // Получаем активную корзину
  private get activeBasket(): Basket | null {
    const baskets = this.baskets;
    if (!baskets) return null;
    return baskets.find(basket => basket.isActiveBasket === true) || null;
  }

  // Получаем название корзины по ID
  private getBasketName(basketId: string): string {
    const baskets = this.baskets;
    if (!baskets) return 'Корзина';
    const basket = baskets.find(b => b.id === basketId);
    return basket?.name || 'Корзина';
  }

  initQuantity() {
    if (this.productData?.packCount) {
      this.selectedQuantity = Math.max(this.minQuantity, this.productData.packCount);
      this.maxQuantity = Math.max(this.maxQuantity, this.productData.packCount * 10);
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

  increaseQuantity(): void {
    if (this.selectedQuantity < this.maxQuantity) {
      this.selectedQuantity++;
      if (this.isInActiveBasket) {
        this.updateActiveBasketQuantity();
      }
    }
  }

  decreaseQuantity(): void {
    if (this.selectedQuantity > this.minQuantity) {
      this.selectedQuantity--;
      if (this.isInActiveBasket) {
        this.updateActiveBasketQuantity();
      }
    } else if (this.selectedQuantity === this.minQuantity && this.isInActiveBasket) {
      this.removeFromActiveBasket();
    }
  }

  validateQuantity(): void {
    if (this.selectedQuantity < this.minQuantity) {
      this.selectedQuantity = this.minQuantity;
    } else if (this.selectedQuantity > this.maxQuantity) {
      this.selectedQuantity = this.maxQuantity;
      this.showNotification(`Максимальное количество: ${this.maxQuantity}`, 'warning');
    }
    
    if (this.isInActiveBasket) {
      this.updateActiveBasketQuantity();
    }
  }

  calculateTotal(): number {
    if (!this.productData?.viewPrice) return 0;
    return this.productData.viewPrice * this.selectedQuantity;
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

  toggleBasketDetailsPopup(event: MouseEvent): void {
    event.stopPropagation();
    this.showBasketDetailsPopup = !this.showBasketDetailsPopup;
  }

  // Добавление в активную корзину
  addToActiveBasket(): void {
    const basketId = this.activeBasketId;
    if (!basketId) {
      this.showNotification('Нет активной корзины', 'error');
      return;
    }
    
    this.addToCartWithBasket({ id: basketId, name: 'Активная корзина' });
  }

  // Добавление в конкретную корзину
  addToCartWithBasket(basket: Basket): void {
    if (!this.productData || !basket?.id) return;
    
    this.basketsService.addProduct({
      productId: this.productData.id,
      basketId: basket.id,
      count: this.selectedQuantity
    }).pipe(take(1)).subscribe({
      next: () => {
        // Обновляем локальное состояние
        this.inCartBaskets.set(basket.id, this.selectedQuantity);
        
        if (basket.id === this.activeBasketId) {
          this.showQuantityControls = true;
        }
        
        this.showBasketPopup = false;
        this.showNotification(`Товар добавлен в "${basket.name}"!`, 'success');
        
        // Обновляем данные товара (нужно будет добавить обновление через сервис)
        this.refreshProductData();
      },
      error: (error) => {
        console.error('Ошибка добавления в корзину:', error);
        this.showNotification('Ошибка при добавлении в корзину', 'error');
      }
    });
  }

  // Обновление количества в активной корзине
  updateActiveBasketQuantity(): void {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.productData) return;
    
    this.basketsService.addProduct({
      productId: this.productData.id,
      basketId: activeBasketId,
      count: this.selectedQuantity
    }).pipe(take(1)).subscribe({
      next: () => {
        this.inCartBaskets.set(activeBasketId, this.selectedQuantity);
        this.showNotification('Количество обновлено!', 'success');
        this.refreshProductData();
      },
      error: (error) => {
        console.error('Ошибка обновления количества:', error);
        this.showNotification('Ошибка обновления количества', 'error');
      }
    });
  }

  // Удаление из активной корзины
  removeFromActiveBasket(): void {
    const activeBasketId = this.activeBasketId;
    if (!activeBasketId || !this.productData) return;
    
    this.basketsService.removeProduct({
      productId: this.productData.id,
      basketId: activeBasketId,
      count: 0
    }).pipe(take(1)).subscribe({
      next: () => {
        this.inCartBaskets.delete(activeBasketId);
        this.showQuantityControls = false;
        this.selectedQuantity = this.productData?.packCount || 1;
        this.showNotification('Товар удален из корзины', 'success');
        this.refreshProductData();
      },
      error: (error) => {
        console.error('Ошибка удаления из корзины:', error);
        this.showNotification('Ошибка удаления из корзины', 'error');
      }
    });
  }

  // Обновление количества в конкретной корзине
  updateBasketQuantity(basketId: string, delta: number): void {
    if (!this.productData || !basketId) return;
    
    const currentQuantity = this.inCartBaskets.get(basketId) || 0;
    const newQuantity = currentQuantity + delta;
    
    if (newQuantity <= 0) {
      this.removeFromBasket(basketId);
      return;
    }
    
    this.basketsService.addProduct({
      productId: this.productData.id,
      basketId: basketId,
      count: newQuantity
    }).pipe(take(1)).subscribe({
      next: () => {
        this.inCartBaskets.set(basketId, newQuantity);
        
        if (basketId === this.activeBasketId) {
          this.selectedQuantity = newQuantity;
        }
        
        this.showNotification('Количество обновлено', 'success');
        this.refreshProductData();
      },
      error: (error) => {
        console.error('Ошибка обновления количества:', error);
        this.showNotification('Ошибка обновления количества', 'error');
      }
    });
  }

  // Удаление из конкретной корзины
  removeFromBasket(basketId: string): void {
    if (!this.productData || !basketId) return;
    
    this.basketsService.removeProduct({
      productId: this.productData.id,
      basketId: basketId,
      count: 0
    }).pipe(take(1)).subscribe({
      next: () => {
        this.inCartBaskets.delete(basketId);
        
        if (basketId === this.activeBasketId) {
          this.showQuantityControls = false;
          this.selectedQuantity = this.productData?.packCount || 1;
        }
        
        this.showNotification('Товар удален из корзины', 'success');
        this.refreshProductData();
      },
      error: (error) => {
        console.error('Ошибка удаления из корзины:', error);
        this.showNotification('Ошибка удаления из корзины', 'error');
      }
    });
  }

  // Переключение избранного
  toggleFavorite(): void {
    if (!this.productData) return;
    
    this.productData.isFavorite = !this.productData.isFavorite;
    
    const message = this.productData.isFavorite 
      ? 'Товар добавлен в избранное' 
      : 'Товар удален из избранного';
    
    this.showNotification(message, 'success');
  }

  // Обновление данных товара (заглушка - нужно реализовать через сервис)
  private refreshProductData(): void {
    // Здесь нужно будет добавить вызов сервиса для обновления данных товара
    // this.productService.getProductById(this.productData.id).subscribe(...)
    
    // Временное обновление UI
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
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}