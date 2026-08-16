import { Component, HostListener, OnInit, NgZone } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { CategorySectionComponent } from '../../core/components/category-section/category-section.component';
import { ProductComponent } from '../../core/components/product/product.component';
import { ProductsService } from '../../core/services/products.service';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from '../../core/components/filters/filters.component';
import { FormsModule } from '@angular/forms';
import { TitleComponent } from '../../core/components/title/title.component';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CategorySectionComponent,
    ProductComponent,
    FiltersComponent,
    TitleComponent,
    RouterLink
  ],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
})
export class CategoriesComponent implements OnInit {
  categoryId!: string;
  categoryData: any;
  searchQuery: string = '';
  subCategories: any[] = [];
  filters: any[] = [];

  products: any[] = [];
  loading: boolean = false;
  loadingMore: boolean = false;
  error: string = '';
  currentPage: number = 1;
  pageSize: number = 20;
  totalItems: number = 0;
  totalPages: number = 0;

  appliedFilters: any[] = [];

  private loadedCategoryIds: Set<string> = new Set();
  
  private isCurrentCategoryComplete: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private categoryService: CategoryService,
    private productsService: ProductsService,
    private zone: NgZone,
  ) { }

  ngOnInit(): void {
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ]).subscribe(([params, queryParams]) => {
      const newCategoryId = params.get('id')!;
      const newSearchQuery = queryParams.get('searchQuery') || '';

      const categoryChanged = this.categoryId !== newCategoryId;
      const searchChanged = this.searchQuery !== newSearchQuery;

      this.categoryId = newCategoryId;
      this.searchQuery = newSearchQuery;

      if (categoryChanged || searchChanged) {
        this.resetState();

        if (this.categoryId !== 'search') {
          this.loadCategoryData();
        } else {
          this.loadProducts();
        }
      } else {
        this.loadProducts();
      }
    });
  }

  resetState(): void {
    this.categoryData = null;
    this.subCategories = [];
    this.products = [];
    this.currentPage = 1;
    this.totalItems = 0;
    this.totalPages = 0;
    this.error = '';
    this.appliedFilters = [];
    this.breadCrumbs = [];
    this.currentBreadCrumbIndex = -1;
    this.isBreadCrumbsLoading = false;
    this.loadedCategoryIds.clear();
    this.isCurrentCategoryComplete = false;
    this.loading = false;
    this.loadingMore = false;
  }

  loadCategoryData(): void {
    if (!this.categoryId) return;

    this.categoryService
      .getCategoryById(this.categoryId)
      .subscribe({
        next: (data: any) => {
          this.categoryData = data.data;
          this.filters = this.categoryData.properties || [];
          this.subCategories = data.data?.subCategories || [];

          this.breadCrumbs = data.breadCrumbs || [];
          this.currentBreadCrumbIndex = this.breadCrumbs.length > 0 ? this.breadCrumbs.length - 2 : -1;
          
          this.loadedCategoryIds.add(this.categoryId);
          this.loadProducts();
        },
        error: (err) => { 
          this.error = 'Ошибка загрузки категории';
          this.loadProducts();
        }
      });
  }

  private breadCrumbs: Array<{ id: string; name: string }> = [];
  private currentBreadCrumbIndex: number = -1;
  private isBreadCrumbsLoading: boolean = false;

  loadProducts(): void {
    if (this.loading || this.loadingMore) return;

    this.loadingMore = true;
    this.isCurrentCategoryComplete = false;

    const currentCategoryId = this.getEffectiveCategoryId();

    const baseFilters: Array<{ field: string; values: string[]; type: number }> = currentCategoryId
      ? [
          { field: "Text", values: [], type: 0 },
          { field: 'ProductCategories.Id', values: [currentCategoryId], type: 11 },
        ]
      : [];

    if (this.loadedCategoryIds.size > 0 && currentCategoryId) {
      const excludedIds = Array.from(this.loadedCategoryIds).filter(id => id !== currentCategoryId);
      if (excludedIds.length > 0) {
        baseFilters.push({
          field: 'ExcludedProductCategories.Id',
          values: excludedIds,
          type: 11
        });
      }
    }

    const allFilters = (this.categoryId === 'search') ?
      [...this.appliedFilters, { field: "searchQuery", values: [this.searchQuery], type: 0 }] :
      [...baseFilters, ...this.appliedFilters];

    this.productsService
      .getAllSearch(allFilters, null, this.currentPage, this.pageSize)
      .subscribe({
        next: (res) => {
          const loadedProducts = res.data || [];
          const pageCount = res.pageCount || Math.ceil(res.totalCount / this.pageSize);

          this.products = [...this.products, ...loadedProducts];
          this.totalItems = res.totalCount;
          this.totalPages = pageCount;

          this.loading = false;
          this.loadingMore = false;

          const isLastPage = this.currentPage >= pageCount;
          const isExhausted = loadedProducts.length === 0 || loadedProducts.length < this.pageSize;
          
          if (isLastPage && isExhausted) {
            this.isCurrentCategoryComplete = true;
            if (currentCategoryId) {
              this.loadedCategoryIds.add(currentCategoryId);
            }
            console.log(`🏁 Категория "${currentCategoryId}" завершена`);
          }
        },
        error: (err) => {
          this.error = 'Произошла ошибка при загрузке товаров';
          this.loading = false;
          this.loadingMore = false;
        },
      });
  }

  private trySwitchToNextBreadCrumb(): void {
    
    this.currentBreadCrumbIndex--;
    
    if (this.currentBreadCrumbIndex < 0) {
      this.totalItems = Infinity;
      this.isBreadCrumbsLoading = false;
      return;
    }
    
    const nextCategory = this.breadCrumbs[this.currentBreadCrumbIndex];
    
    if (!nextCategory?.id) {
      console.warn(`⚠️ Неверный индекс: ${this.currentBreadCrumbIndex}`);
      this.trySwitchToNextBreadCrumb();
      return;
    }
    
    this.isBreadCrumbsLoading = true;
    this.currentPage = 1;
    this.totalItems = 0;
    this.totalPages = 0;
    this.isCurrentCategoryComplete = false;
  
    this.loading = false;
    this.loadingMore = false;
    
    this.zone.run(() => {
      this.loadProducts();
    });
  }

  private getEffectiveCategoryId(): string | null {
    if (this.categoryId === 'search') return null;
    
    if (this.isBreadCrumbsLoading && this.currentBreadCrumbIndex >= 0 && this.currentBreadCrumbIndex < this.breadCrumbs.length) {
      return this.breadCrumbs[this.currentBreadCrumbIndex].id;
    }
    
    return this.categoryId;
  }

  onFiltersChange(filters: any[]): void {
    this.appliedFilters = filters;
    this.currentPage = 1;
    this.loadProducts();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  loadMore(): void {
    this.currentPage++;
    this.loadProducts();
  }

  retry(): void {
    this.error = '';
    this.currentPage = 1;
    this.loadProducts();
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
    if (this.loading || this.loadingMore) return;
    if (this.totalItems === Infinity) return;
    
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const triggerPosition = pageHeight - 500;
    
    if (scrollPosition < triggerPosition) return;
    
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadProducts();
      return;
    }
    
    if (this.isCurrentCategoryComplete && this.currentBreadCrumbIndex >= 0) {
      this.trySwitchToNextBreadCrumb();
      return;
    }
    
    this.totalItems = Infinity;
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}