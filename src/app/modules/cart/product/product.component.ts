import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface RelatedProduct {
  id: number;
  name: string;
  price: number;
  image: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  qty: number;
  image: string;
  sku: string;
  description?: string;
  rating?: number;
  reviews?: number;
  available?: boolean;
  oldPrice?: number;
  related?: RelatedProduct[];
}

@Component({
  selector: 'app-product',
  imports: [CommonModule, FormsModule],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent {
  @Input() product!: Product;

  toggleRelated(product: any) {
    product.relatedCollapsed = !product.relatedCollapsed;
}


  removeProduct(id: number) {
    // this.products = this.products.filter(p => p.id !== id);
  }

  increaseQty(product: Product) {
    product.qty += 1;
  }

  decreaseQty(product: Product) {
    if (product.qty > 1) product.qty -= 1;
  }

}
