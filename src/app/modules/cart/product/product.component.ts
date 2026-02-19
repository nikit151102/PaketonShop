import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
  OnInit
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
  productImageLinks?: any;
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
export class ProductComponent implements OnChanges, OnInit {
  @Input() product!: BasketProduct;
  @Input() selected: boolean = false;
  @Output() selectionChange = new EventEmitter<{ id: string; selected: boolean }>();
  @Output() quantityChange = new EventEmitter<{ id: string; quantity: number }>();
  @Output() remove = new EventEmitter<string>();
  @Output() quickView = new EventEmitter<Product>();
  @Output() addRelated = new EventEmitter<RelatedProduct>();

  relatedCollapsed = true;
  isWishlisted = false;
  wishlistAnimate = false;
  quantityError: string | null = null;
  quantityChanging: 'increase' | 'decrease' | null = null;
  removeConfirm = false;
  addedRelatedIds = new Set<string>();
  isMobile: boolean = false;

  private _hasDiscount: boolean = false;
  private _discountPrice: number = 0;
  private _totalPrice: number = 0;
  private _savingAmount: number = 0;

  productImage: string = 'assets/images/product-placeholder.svg';

  constructor(private cdr: ChangeDetectorRef) { }


  ngOnInit(): void {
    this.updateProductImage();
    this.updateCalculatedValues();
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile.bind(this));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product']) {
      this.updateProductImage();
      this.updateCalculatedValues();
      this.quantityError = null;
    }
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 640;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.checkMobile.bind(this));
  }

  private updateProductImage(): void {
    if (this.product?.product?.productImageLinks?.[0]) {
      this.productImage = this.product.product.productImageLinks[0];
    } else {
      this.productImage = 'assets/images/product-placeholder.svg';
    }
  }

  private updateCalculatedValues(): void {
    if (!this.product?.product) return;

    this._hasDiscount = !!this.product.product.discountPercentage &&
      this.product.product.discountPercentage > 0;

    if (this._hasDiscount) {
      this._discountPrice = this.product.product.retailPrice *
        (1 - this.product.product.discountPercentage! / 100);
      this._savingAmount = this.product.product.retailPrice - this._discountPrice;
    } else {
      this._discountPrice = this.product.product.retailPrice;
      this._savingAmount = 0;
    }

    this._totalPrice = this._discountPrice * (this.product.count || 1);
  }

  get isAvailable(): boolean {
    return this.product?.product?.available !== false;
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

  get savingAmount(): number {
    return this._savingAmount;
  }

  onImageError(): void {
    this.productImage = 'assets/images/product-placeholder.svg';
    this.cdr.markForCheck();
  }

  onRelatedImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/product-placeholder.svg';
  }

  isStarFilled(starIndex: number): boolean {
    if (!this.product?.product?.rating) return false;
    const rating = this.product.product.rating;
    return starIndex < Math.floor(rating);
  }

  isStarHalf(starIndex: number): boolean {
    if (!this.product?.product?.rating) return false;
    const rating = this.product.product.rating;
    return starIndex === Math.floor(rating) && rating % 1 >= 0.5;
  }

  getReviewsWord(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) return 'отзыв';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'отзыва';
    return 'отзывов';
  }

  onSelectionChange(event: Event): void {
    if (!this.isAvailable) return;
    const checked = (event.target as HTMLInputElement).checked;
    this.selectionChange.emit({ id: this.product.id, selected: checked });
  }

  toggleRelated(): void {
    this.relatedCollapsed = !this.relatedCollapsed;
    this.cdr.markForCheck();
  }

  toggleWishlist(): void {
    this.isWishlisted = !this.isWishlisted;
    this.wishlistAnimate = true;
    this.cdr.markForCheck();

    // Здесь можно добавить логику сохранения в избранное
    console.log('Wishlist toggled:', this.isWishlisted);
  }

  increaseQty(): void {
    if (!this.product || !this.isAvailable) return;
    const newCount = (this.product.count || 1) + 1;
    this.quantityChanging = 'increase';
    this.validateAndUpdateQuantity(newCount);
  }

  decreaseQty(): void {
    if (!this.product || !this.isAvailable) return;
    const currentCount = this.product.count || 1;
    if (currentCount <= 1) return;
    this.quantityChanging = 'decrease';
    this.validateAndUpdateQuantity(currentCount - 1);
  }

  onQuantityInput(event: Event): void {
    if (!this.product || !this.isAvailable) return;

    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    this.validateAndUpdateQuantity(value);
  }

  validateQuantityInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.quantityError) {
      input.value = (this.product.count || 1).toString();
      this.quantityError = null;
      this.cdr.markForCheck();
    }
  }

  private validateAndUpdateQuantity(newCount: number): void {
    if (isNaN(newCount) || newCount < 1) {
      this.quantityError = 'Минимальное количество: 1';
      this.cdr.markForCheck();
      return;
    }

    if (newCount > 99) {
      this.quantityError = 'Максимальное количество: 99';
      this.cdr.markForCheck();
      return;
    }

    if (newCount === (this.product.count || 1)) {
      return;
    }

    this.quantityError = null;
    this.updateQuantity(newCount);
  }

  private updateQuantity(newCount: number): void {
    this.quantityChange.emit({
      id: this.product.id,
      quantity: newCount
    });

    this._totalPrice = this._discountPrice * newCount;
    this.cdr.markForCheck();
  }

  removeProduct(): void {
    if (!this.removeConfirm) {
      this.removeConfirm = true;
      setTimeout(() => {
        this.removeConfirm = false;
        this.cdr.markForCheck();
      }, 3000);
      return;
    }

    if (this.product) {
      this.remove.emit(this.product.id);
    }
  }

  addRelatedToCart(item: RelatedProduct): void {
    this.addRelated.emit(item);
    this.addedRelatedIds.add(item.id);
    this.cdr.markForCheck();

    setTimeout(() => {
      this.addedRelatedIds.delete(item.id);
      this.cdr.markForCheck();
    }, 2000);
  }

  isRelatedAdded(id: string): boolean {
    return this.addedRelatedIds.has(id);
  }
}