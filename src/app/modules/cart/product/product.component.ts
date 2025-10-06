import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface Product {
  id: string;                        // UUID товара
  article: string;                   // Артикул
  shortName: string;                 // Короткое название (может быть пустым)
  fullName: string;                  // Полное название
  description: string;               // Описание
  measurementUnitId: string;         // Единица измерения (UUID)
  retailPrice: number;               // Розничная цена
  retailPriceDest: number;           // Розничная цена (с учётом региона или скидки)
  wholesalePrice: number;            // Оптовая цена
  wholesalePriceDest: number;        // Оптовая цена (с учётом региона или скидки)
  saleTypeId: string | null;         // Тип продажи (может отсутствовать)
  userBasketId?: string;             // ID корзины, в которой лежит товар
  related?: RelatedProduct[];        // Список похожих товаров
  available?: any;
  reviews?: any;
  rating?: any;
  productImageLink?: string
}

export interface RelatedProduct {
  id: string;
  name: string;
  retailPrice: number;
  wholesalePrice: number;
  image?: string;
}

export interface BasketProduct {
  id: string;               // ID записи в корзине
  count: number;            // Количество товаров
  product: Product;         // Сам товар
}

@Component({
  selector: 'app-product',
  imports: [CommonModule, FormsModule],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent {
  @Input() product!: BasketProduct;
  @Input() selected: boolean = false;
  @Output() selectionChange = new EventEmitter<{ id: string, selected: boolean }>();

  relatedCollapsed = true;

  // Изменение выделения
  onSelectionChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectionChange.emit({ id: this.product.id, selected: checked });
  }

  // Сворачивание / разворачивание блока похожих товаров
  toggleRelated(): void {
    this.relatedCollapsed = !this.relatedCollapsed;
  }

  // Удаление продукта (только уведомление родителя)
  @Output() remove = new EventEmitter<string>();

  removeProduct(): void {
    this.remove.emit(this.product.id);
  }

  // Изменение количества
  increaseQty(): void {
    this.product.count += 1;
  }

  decreaseQty(): void {
    if (this.product.count > 1) {
      this.product.count -= 1;
    }
  }
}