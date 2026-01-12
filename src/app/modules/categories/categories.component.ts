import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { CategorySectionComponent } from '../../core/components/category-section/category-section.component';
import { ProductComponent } from '../../core/components/product/product.component';
import { ProductsService } from '../../core/services/products.service';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from '../../core/components/filters/filters.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CategorySectionComponent,
    ProductComponent,
    FiltersComponent,
    RouterLink
  ],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
})
export class CategoriesComponent implements OnInit {
  categoryId!: string;
  categoryData: any;
  subCategories: any[] = [];
  filters: any[] = [];

  products: any[] = [];
  loading: boolean = false;
  loadingMore: boolean = false;
  error: string = '';
  currentPage: number = 0;
  pageSize: number = 20;
  totalItems: number = 0;
  totalPages: number = 0;

  appliedFilters: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private categoryService: CategoryService,
    private productsService: ProductsService,
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.categoryId = params.get('id')!;
      this.resetState();
      this.loadCategoryData();
      this.loadProducts();
    });
  }

  resetState(): void {
    this.categoryData = null;
    this.subCategories = [];
    this.products = [];
    this.currentPage = 0;
    this.totalItems = 0;
    this.totalPages = 0;
    this.error = '';
    this.appliedFilters = [];
  }

  loadCategoryData(): void {
    if (!this.categoryId) return;

    this.categoryService
      .getCategoryById(this.categoryId)
      .subscribe({
        next: (data: any) => {
          this.categoryData = data.data;
          console.log('this.categoryData', this.categoryData)
          this.filters = this.categoryData.properties
          this.subCategories = data.data?.subCategories || [];
        },
        error: (err) => {
          console.error('Ошибка загрузки категории:', err);
        }
      });
  }

  loadProducts(): void {
    if (this.loading || this.loadingMore) return;

    if (this.currentPage === 0) {
      this.loading = true;
    } else {
      this.loadingMore = true;
    }

    const baseFilters = this.categoryId
      ? [
        {
          field: 'ProductCategories.Id',
          values: [this.categoryId],
          type: 11,
        },
      ]
      : [];

    const allFilters = [...baseFilters, ...this.appliedFilters];

    this.productsService
      .getAll(allFilters, null, this.currentPage, this.pageSize)
      .subscribe({
        next: (res) => {
          if (this.currentPage === 0) {
            this.products = res.data;
          } else {
            this.products = [...this.products, ...res.data];
          }

          this.totalItems = res.totalCount;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.loading = false;
          this.loadingMore = false;
        },
        error: (err) => {
          this.error = 'Произошла ошибка при загрузке товаров';
          this.loading = false;
          this.loadingMore = false;
        },
      });
  }


  onFiltersChange(filters: any[]): void {
    this.appliedFilters = filters;
    this.currentPage = 0;
    this.loadProducts();
  }

  applyFilters(): void {
    // Применение фильтров
    this.currentPage = 0;
    this.loadProducts();
  }

  loadMore(): void {
    this.currentPage++;
    this.loadProducts();
  }

  retry(): void {
    this.error = '';
    this.currentPage = 0;
    this.loadProducts();
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.products.length < this.totalItems) {
      this.currentPage++;
      this.loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage + 1 - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;

    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.loading || this.loadingMore || this.products.length >= this.totalItems) return;

    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const triggerPosition = pageHeight - 500;

    if (scrollPosition >= triggerPosition) {
      this.currentPage++;
      this.loadProducts();
    }
  }
}