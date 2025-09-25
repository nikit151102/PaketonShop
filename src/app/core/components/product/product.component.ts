import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../location/location.service';
import { CleanStringLinkPipe } from "../../pipes/clear-url";
import { Product } from '../../../../models/product.interface';
import { Router } from '@angular/router';


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

  constructor(public locationService: LocationService, private router: Router) { }

  ngOnInit(): void {
    this.city$ = this.locationService.city$;
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


  selectedQuantity = 1;
  quantitySelectorVisible = false;

  toggleQuantitySelector() {
    this.quantitySelectorVisible = !this.quantitySelectorVisible;
  }

  addToCart(event: MouseEvent) {
    event.stopImmediatePropagation();
    event.preventDefault();

    this.inCart = true;
    this.quantitySelectorVisible = false;
  }

  onProductClick(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.add-cart') || (event.target as HTMLElement).closest('.confirm-quantity') || (event.target as HTMLElement).closest('.input-quantity')
      || (event.target as HTMLElement).closest('.quantity-btn')
      || (event.target as HTMLElement).closest('.quick-view')
    ) {
      event.stopPropagation();
      return;
    }

    this.router.navigate(['/product', this.product.id]);
  }

  toggleFavorite() {
    // this.product.favorite = !this.product.favorite;
  }

  toggleCompare() {
    // this.product.compare = !this.product.compare;
  }

  increaseQty(product: any) {
    this.selectedQuantity++;
  }

  decreaseQty(product: any) {
    if (product.qty > 1) {
      this.selectedQuantity--;
    } else {
      this.inCart = false;
      this.selectedQuantity = 1;
    }
  }

  openQuickView() {
    this.showQuickView = true;
  }

  closeQuickView() {
    this.showQuickView = false;
  }

}











