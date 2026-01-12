import { CommonModule } from '@angular/common';
import { 
  ChangeDetectionStrategy, 
  Component, 
  EventEmitter, 
  Input, 
  Output,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface Product {
  id: string;
  article: string;
  shortName: string;
  fullName: string;
  description: string;
  measurementUnitId: string;
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  saleTypeId: string | null;
  userBasketId?: string;
  related?: RelatedProduct[];
  available?: boolean;
  reviews?: number;
  rating?: number;
  productImageLink?: string;
  discountPercentage?: number;
}

export interface RelatedProduct {
  id: string;
  name: string;
  retailPrice: number;
  wholesalePrice: number;
  image?: string;
  discountPercentage?: number;
}

export interface BasketProduct {
  id: string;
  count: number;
  product: Product;
}

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductComponent implements OnChanges {
  @Input() product!: BasketProduct;
  @Input() selected: boolean = false;
  @Output() selectionChange = new EventEmitter<{ id: string; selected: boolean }>();
  @Output() quantityChange = new EventEmitter<{ id: string; quantity: number }>();
  @Output() remove = new EventEmitter<string>();
  
  relatedCollapsed = true;
  isWishlisted = false;
  
  // Кэшируем вычисляемые значения
  private _hasDiscount: boolean = false;
  private _discountPrice: number = 0;
  private _totalPrice: number = 0;
  private _ratingFloor: number = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product']) {
      this.updateCalculatedValues();
    }
  }

  private updateCalculatedValues(): void {
    if (!this.product?.product) return;
    
    this._hasDiscount = !!this.product.product.discountPercentage && 
                       this.product.product.discountPercentage > 0;
    
    if (this._hasDiscount) {
      this._discountPrice = this.product.product.retailPrice * 
                           (1 - this.product.product.discountPercentage! / 100);
    } else {
      this._discountPrice = this.product.product.retailPrice;
    }
    
    this._totalPrice = this._discountPrice * this.product.count;
    this._ratingFloor = Math.floor(this.product.product.rating || 0);
  }

  get hasDiscount(): boolean {
    return this._hasDiscount;
  }

  get discountPrice(): number {
    return this._discountPrice;
  }

  get totalPrice(): number {
    return this._totalPrice;
  }

  // Метод для получения округленного рейтинга
  getRatingFloor(): number {
    return this._ratingFloor;
  }

  // Альтернативно: метод для проверки заполненности звезды
  isStarFilled(starIndex: number): boolean {
    if (!this.product?.product?.rating) return false;
    return starIndex < Math.floor(this.product.product.rating);
  }

  onSelectionChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectionChange.emit({ id: this.product.id, selected: checked });
  }

  toggleRelated(): void {
    this.relatedCollapsed = !this.relatedCollapsed;
    this.cdr.markForCheck(); // Помечаем для проверки изменений
  }

  toggleWishlist(): void {
    this.isWishlisted = !this.isWishlisted;
    this.cdr.markForCheck(); // Помечаем для проверки изменений
  }

  increaseQty(): void {
    // Создаем новый объект вместо мутации
    const newCount = this.product.count + 1;
    
    // Emit событие с новым количеством
    this.quantityChange.emit({ 
      id: this.product.id, 
      quantity: newCount 
    });
    
    // Обновляем локальные вычисляемые значения
    this._totalPrice = this._discountPrice * newCount;
    this.cdr.markForCheck(); // Помечаем для проверки изменений
  }

  decreaseQty(): void {
    if (this.product.count <= 1) return;
    
    const newCount = this.product.count - 1;
    
    // Emit событие с новым количеством
    this.quantityChange.emit({ 
      id: this.product.id, 
      quantity: newCount 
    });
    
    // Обновляем локальные вычисляемые значения
    this._totalPrice = this._discountPrice * newCount;
    this.cdr.markForCheck(); // Помечаем для проверки изменений
  }

  onQuantityInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    
    if (value >= 1 && value !== this.product.count) {
      // Emit событие с новым количеством
      this.quantityChange.emit({ 
        id: this.product.id, 
        quantity: value 
      });
      
      // Обновляем локальные вычисляемые значения
      this._totalPrice = this._discountPrice * value;
      this.cdr.markForCheck(); // Помечаем для проверки изменений
    } else {
      input.value = this.product.count.toString();
    }
  }

  removeProduct(): void {
    this.remove.emit(this.product.id);
  }
}