import { Component } from '@angular/core';
import { CarouselBannerComponent } from './components/carousel-banner/carousel-banner.component';
import { CategorySectionComponent } from './components/category-section/category-section.component';
import { PopularProductsComponent } from './components/popular-products/popular-products.component';
import { SalesProductsComponent } from './components/sales-products/sales-products.component';
import { GroupsSectionComponent } from './components/groups-section/groups-section.component';

@Component({
  selector: 'app-home',
  imports: [CarouselBannerComponent,CategorySectionComponent, PopularProductsComponent, SalesProductsComponent, GroupsSectionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
