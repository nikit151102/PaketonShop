import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-basket-manager-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './basket-manager-modal.component.html',
  styleUrl: './basket-manager-modal.component.scss'
})
export class BasketManagerModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() visible: boolean = false;
  @Input() product: any;
  @Input() baskets: any[] = [];
  @Input() selectedBasketId: string | null = null;
  @Input() searchTerm: string = '';

  @Output() close = new EventEmitter<void>();
  @Output() selectBasket = new EventEmitter<any>();
  @Output() addToBasket = new EventEmitter<string>();
  @Output() removeFromBasket = new EventEmitter<string>();
  @Output() updateQuantity = new EventEmitter<{ basketId: string, delta: number }>();
  @Output() updateQuantityFromInput = new EventEmitter<any>();
  @Output() createBasket = new EventEmitter<void>();
  @Output() deleteBasket = new EventEmitter<string>(); // Новый event для удаления корзины
  @Output() searchChange = new EventEmitter<string>();

  filteredBaskets: any[] = [];
  showHelp: boolean = false;
  maxBasketsCount: number = 5; // Максимальное количество корзин
  basketToDelete: any = null; // Корзина для подтверждения удаления

  ngOnInit() {
    this.filterBaskets();
    if (this.visible) {
      document.body.style.overflow = 'hidden';
    }
    // Загружаем состояние помощи
    const savedHelpState = localStorage.getItem('basketManagerHelpShown');
    if (savedHelpState !== null) {
      this.showHelp = savedHelpState === 'true';
    }
  }

  ngOnChanges() {
    this.filterBaskets();
  }

  ngOnDestroy() {
    document.body.style.overflow = 'auto';
    // Сохраняем состояние помощи
    localStorage.setItem('basketManagerHelpShown', String(this.showHelp));
  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
    localStorage.setItem('basketManagerHelpShown', String(this.showHelp));
  }

  onSearch(event: any) {
    this.searchChange.emit(event.target.value);
  }

  filterBaskets() {
    if (!this.baskets) {
      this.filteredBaskets = [];
      return;
    }

    if (!this.searchTerm) {
      this.filteredBaskets = this.sortBaskets([...this.baskets]);
      return;
    }

    const filtered = this.baskets.filter(basket =>
      basket.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.filteredBaskets = this.sortBaskets(filtered);
  }

  private sortBaskets(baskets: any[]): any[] {
    return baskets.sort((a, b) => {
      // Активная корзина вверх
      if (a.isActiveBasket && !b.isActiveBasket) return -1;
      if (!a.isActiveBasket && b.isActiveBasket) return 1;

      // Корзины с товаром выше
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

  getPrice(): number {
    return this.product?.retailPrice || this.product?.viewPrice || 0;
  }

  updateQuantityInput(event: any, basketId: string) {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      this.updateQuantityFromInput.emit({ basketId: basketId, value: value });
    } else {
      this.updateQuantityFromInput.emit({ basketId: basketId, value: 1 });
    }
  }

  // Проверка, достигнут ли лимит корзин
  isBasketLimitReached(): boolean {
    return this.baskets && this.baskets.length >= this.maxBasketsCount;
  }

  // Получение сообщения о лимите
  getBasketLimitMessage(): string {
    return `Вы можете создать не более ${this.maxBasketsCount} корзин`;
  }

  // Оставшееся количество корзин для создания
  getRemainingBasketsCount(): number {
    return Math.max(0, this.maxBasketsCount - (this.baskets?.length || 0));
  }

  // Обработчик создания корзины с проверкой лимита
  onCreateBasket() {
    if (this.isBasketLimitReached()) {
      this.showLimitNotification();
      return;
    }
    this.createBasket.emit();
  }

  // Показать уведомление о достижении лимита
  private showLimitNotification() {
    const notification = document.createElement('div');
    notification.className = 'limit-notification';
    notification.innerHTML = `
      <div class="limit-notification-content">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#dc2626" stroke-width="1.5"/>
          <path d="M10 6V10M10 14H10.01" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>${this.getBasketLimitMessage()}</span>
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 2000);
    }, 10);
  }

  // Открыть диалог подтверждения удаления корзины
  confirmDeleteBasket(basket: any, event: Event) {
    event.stopPropagation();
    this.basketToDelete = basket;
  }

  // Закрыть диалог подтверждения
  cancelDeleteBasket() {
    this.basketToDelete = null;
  }

  // Подтверждение удаления корзины
  deleteBasketConfirm() {
    if (this.basketToDelete) {
      this.deleteBasket.emit(this.basketToDelete.id);
      this.basketToDelete = null;

      // Показать уведомление об успешном удалении
      this.showSuccessNotification('Корзина удалена');
    }
  }

  // Показать уведомление об успешном действии
  private showSuccessNotification(message: string) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
      <div class="success-notification-content">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#327120" stroke-width="1.5"/>
          <path d="M6 10L9 13L14 7" stroke="#327120" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 2000);
    }, 10);
  }

  // Проверка, можно ли удалить корзину (нельзя удалить активную корзину)
  canDeleteBasket(basket: any): boolean {
    return !basket.isActiveBasket;
  }

  // Получить текст подсказки для кнопки удаления
  getDeleteTooltip(basket: any): string {
    if (basket.isActiveBasket) {
      return 'Нельзя удалить активную корзину. Сначала сделайте другую корзину активной';
    }
    return 'Удалить корзину';
  }
}