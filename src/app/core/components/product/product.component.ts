import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AboutRoutingModule } from "../../../modules/about/about-routing.module";
import { StorageUtils } from '../../../../utils/storage.utils';
import { LocationService } from '../location/location.service';


@Component({
  selector: 'app-product',
  imports: [CommonModule, FormsModule, AboutRoutingModule],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent implements OnInit {


  @Input() view: 'compact' | 'wide' = 'compact';
  @Input() showCompare: boolean = true;
  @Input() product: any;
  city$!: typeof this.locationService.city$;
  inCart: boolean = false;
  hovered = true;
  showQuickView = false;

  constructor(public locationService: LocationService) { }

  ngOnInit(): void {
    this.city$ = this.locationService.city$;

  }

  // Метод для получения цены в зависимости от города
  getPrice(city: string | null): number {
    if (city === 'Барнаул') {
      return this.product.retailPrice;
    } else {
      return this.product.wholesalePrice;
    }
  }

  toggleFavorite() {
    this.product.favorite = !this.product.favorite;
  }

  toggleCompare() {
    this.product.compare = !this.product.compare;
  }

  increaseQty(product: any) {
    product.qty++;
  }

  decreaseQty(product: any) {
    if (product.qty > 1) {
      product.qty--;
    } else {
      this.inCart = false;
      product.qty = 1;
    }
  }

  openQuickView() {
    this.showQuickView = true;
  }

  closeQuickView() {
    this.showQuickView = false;
  }

}











