import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CarouselBannerComponent } from './components/carousel-banner/carousel-banner.component';
import { CategorySectionComponent } from '../../core/components/category-section/category-section.component';
import { CategoryService } from '../../core/services/category.service';
import { ProductComponent } from '../../core/components/product/product.component';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../core/services/products.service';
import { StorageUtils } from '../../../utils/storage.utils';
import { BusinessBlockComponent } from './components/business-block/business-block.component';
import { CompareCommonBtnComponent } from '../../core/components/compare-common-btn/compare-common-btn.component';
import { GroupsSectionComponent } from './components/groups-section/groups-section.component';
import { TitleComponent } from '../../core/components/title/title.component';
import { ToastService } from '../../core/components/toast/toast.service';
import { CurrentOrdersComponent } from '../../core/components/current-orders/current-orders.component';
import { User, UserService } from '../../core/services/user.service';
import { map, Observable } from 'rxjs';
import { SalesProductsComponent } from './components/sales-products/sales-products.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    CarouselBannerComponent,
    CategorySectionComponent,
    ProductComponent,
    BusinessBlockComponent,
    CompareCommonBtnComponent,
    GroupsSectionComponent,
    TitleComponent,
    CurrentOrdersComponent,
    SalesProductsComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  categories: any[] = [];
  products: any[] = [];
  loading: boolean = false;
  error: string = '';
  currentPage: number = 1;
  pageSize: number = 20;
  totalItems: number = 0;
  selectedCategory: string = '';

  private readonly toast = inject(ToastService);
  private userService = inject(UserService);

  userId$: Observable<string | null> = this.userService.user$.pipe(
    map((user: User | null) => user?.id ?? null),
  );

  constructor(
    private categoryService: CategoryService,
    private productsService: ProductsService,
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
          this.toast.error(
            err?.error?.Message ?? 'Не удалось загрузить категории',
            'Ошибка загрузки'
          );
        },
      });
    }
  }

  loadProducts(): void {
    if (this.loading) return;

    this.loading = true;
    const filters = this.selectedCategory
      ? [
        {
          field: 'ProductCategories.Id',
          values: [this.selectedCategory],
          type: 11,
        },
      ]
      : [];

    this.productsService
      .getAllSearch(filters, null, this.currentPage, this.pageSize)
      .subscribe({
        next: (res) => {
          this.products = this.products.concat(res.data);
          this.totalItems = res.totalCount;
          this.loading = false;
          this.currentPage++;
        },
        error: (err) => {
          const message = err?.error?.message ?? 'Произошла ошибка при загрузке продуктов';
          this.error = message;
          this.loading = false;

          if (this.currentPage === 1) {
            this.toast.error(message, 'Ошибка загрузки');
          }
        },
      });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= pageHeight - 350 && !this.loading) {
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
