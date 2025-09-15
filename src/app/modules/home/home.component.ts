import { Component, HostListener, OnInit } from '@angular/core';
import { CarouselBannerComponent } from './components/carousel-banner/carousel-banner.component';
import { SalesProductsComponent } from './components/sales-products/sales-products.component';
import { GroupsSectionComponent } from './components/groups-section/groups-section.component';
import { CategorySectionComponent } from '../../core/components/category-section/category-section.component';
import { CategoryService } from '../../core/services/category.service';
import { ProductComponent } from '../../core/components/product/product.component';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../core/services/products.service';
import { StorageUtils } from '../../../utils/storage.utils';

@Component({
  selector: 'app-home',
  imports: [CommonModule, CarouselBannerComponent, CategorySectionComponent, ProductComponent, SalesProductsComponent, GroupsSectionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  categories: any[] = [];
  products: any[] = [];
  loading: boolean = false;
  error: string = '';
  currentPage: number = 0;
  pageSize: number = 20;
  totalItems: number = 0;
  selectedCategory: string = '';

  constructor(
    private categoryService: CategoryService,
    private productsService: ProductsService
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {

    const cachedCategories = StorageUtils.getMemoryCache<any[]>('categories');

    if (cachedCategories) {
      this.categories = cachedCategories;
    } else {
      this.categoryService.getFirstLevelCategories().subscribe({
        next: (res) => {
          this.categories = res.data;
          StorageUtils.setMemoryCache('categories', res.data, 600);
        },
        error: (err) => {
          console.error('Error fetching categories:', err);
        }
      });
    }
  }


  loadProducts(): void {
    if (this.loading) return;

    this.loading = true;
    const filters = this.selectedCategory ? [{ field: 'ProductCategories.Id', values: [this.selectedCategory], type: 11 }] : [];

    this.productsService.getAll(filters, null, this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.products = this.products.concat(res.data);
        this.totalItems = res.totalCount;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Произошла ошибка при загрузке продуктов';
        this.loading = false;
      }
    });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= pageHeight - 100 && !this.loading) {
      this.currentPage++;
      this.loadProducts(); 
    }
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.currentPage = 0;
    this.products = [];    
    this.loadProducts();  
  }

}