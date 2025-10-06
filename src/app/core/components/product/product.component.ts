import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../location/location.service';
import { CleanStringLinkPipe } from "../../pipes/clear-url";
import { Product } from '../../../../models/product.interface';
import { Router } from '@angular/router';
import { ProductFavoriteService } from '../../api/product-favorite.service';
import { BasketsService } from '../../api/baskets.service';
import { StorageUtils } from '../../../../utils/storage.utils';
import { memoryCacheEnvironment } from '../../../../environment';
import { take } from 'rxjs';


@Component({
  selector: 'app-product',
  imports: [CommonModule, FormsModule, CleanStringLinkPipe],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent implements OnInit {

  @Input() view: 'compact' | 'wide' = 'compact';
  @Input() showCompare: boolean = true;
  @Input() product!: Product;
  city$!: typeof this.locationService.city$;
  inCart: boolean = false;
  hovered = true;
  showQuickView = false;
  selectedQuantity = 1;
  quantitySelectorVisible = false;

  constructor(public locationService: LocationService,
    private router: Router,
    private productFavoriteService: ProductFavoriteService,
    private basketsService: BasketsService) { }

  ngOnInit(): void {
    this.city$ = this.locationService.city$;
  }

  private get activeBasketId(): string | null {
    const baskets: any = StorageUtils.getMemoryCache(memoryCacheEnvironment.baskets.key);
    return baskets?.[0]?.id ?? null;
  }

  public get baskets(): any | null {
    const baskets: any = StorageUtils.getMemoryCache(memoryCacheEnvironment.baskets.key);
    return baskets
  }

  showBasketPopup = false;

  toggleBasketPopup(event: MouseEvent): void {
    event.stopPropagation();
    this.showBasketPopup = !this.showBasketPopup;
  }

  selectBasket(basket: any): void {
    this.basketsService
      .addProduct({ productId: this.product.id, basketId: basket.id, count: 1 })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.inCart = true;
          this.showBasketPopup = false;
          this.quantitySelectorVisible = true;
        },
        error: err => console.error('Ошибка при добавлении товара в корзину:', err)
      });
  }



  getPrice(city: string | null): number {
    if (city === 'Барнаул') {
      return this.product.retailPrice;
    } else {
      return this.product.wholesalePrice;
    }
  }

  getTotalPrice(city: string | null): string {
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
          this.selectedQuantity = count;
          this.inCart = true;
          this.quantitySelectorVisible = true;
        },
        error: (err) => console.error('Ошибка при обновлении корзины', err)
      });
  }


  increaseQty(): void {
    this.updateBasket(+1);
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
        },
        error: (err) => console.error('Ошибка при удалении товара', err)
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
    const excluded = ['add-cart', 'confirm-quantity', 'input-quantity', 'quantity-btn', 'quick-view'];
    const target = event.target as HTMLElement;
    if (excluded.some(cls => target.closest(`.${cls}`))) {
      event.stopPropagation();
      return;
    }
    this.router.navigate(['/product', this.product.id]);
  }

  toggleFavorite(event: MouseEvent) {
    event.stopImmediatePropagation();
    event.preventDefault();
    this.productFavoriteService.addToFavorites(this.product.id).subscribe((value: any) => {

    })
  }

  toggleCompare(event: MouseEvent) {
    event.stopImmediatePropagation();
    event.preventDefault();
    this.productFavoriteService.removeFromFavorites(this.product.id).subscribe((value: any) => {

    })
  }

  openQuickView() {
    this.showQuickView = true;
  }

  closeQuickView() {
    this.showQuickView = false;
  }

}











