import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-basket-manager-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './basket-manager-modal.component.html',
  styleUrl: './basket-manager-modal.component.scss'
})
export class BasketManagerModalComponent implements OnInit, OnDestroy {
  @Input() visible: boolean = false;
  @Input() product: any;
  @Input() baskets: any[] = [];
  @Input() selectedBasketId: string | null = null;
  @Input() searchTerm: string = '';
  
  @Output() close = new EventEmitter<void>();
  @Output() selectBasket = new EventEmitter<any>();
  @Output() addToBasket = new EventEmitter<string>();
  @Output() removeFromBasket = new EventEmitter<string>();
  @Output() updateQuantity = new EventEmitter<{basketId: string, delta: number}>();
  @Output() updateQuantityFromInput = new EventEmitter<any>();
  @Output() createBasket = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  filteredBaskets: any[] = [];
  showHelp: boolean = false;

  ngOnInit() {
    this.filterBaskets();
    if (this.visible) {
      document.body.style.overflow = 'hidden';
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
    // Можно расширить логику в зависимости от города пользователя
    // Сейчас возвращает розничную цену
    return this.product?.retailPrice || this.product?.viewPrice || 0;
  }

  updateQuantityInput(event: any, basketId: string) {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      this.updateQuantityFromInput.emit({basketId: basketId, value: value});
    } else {
      // Сброс на 1 если введено некорректное значение
      this.updateQuantityFromInput.emit({basketId: basketId, value: 1});
    }
  }
}