import { Component, OnInit } from '@angular/core';
import { CarouselBannerComponent } from './components/carousel-banner/carousel-banner.component';
import { PopularProductsComponent } from './components/popular-products/popular-products.component';
import { SalesProductsComponent } from './components/sales-products/sales-products.component';
import { GroupsSectionComponent } from './components/groups-section/groups-section.component';
import { CategorySectionComponent } from '../../core/components/category-section/category-section.component';
import { CategoryService } from '../../core/services/category.service';

@Component({
  selector: 'app-home',
  imports: [CarouselBannerComponent, CategorySectionComponent, PopularProductsComponent, SalesProductsComponent, GroupsSectionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  categories: any;
  constructor(private categoryService: CategoryService) { }

  ngOnInit(): void {
    this.categoryService.getFirstLevelCategories().subscribe({
      next: (res) => {
        console.log('Категории:', res.data);
        this.categories = res.data
      },
      error: (err) => {
        console.error('Ошибка:', err);
      }
    });
  }


}
