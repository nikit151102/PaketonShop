import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FiltersComponent } from '../../core/components/filters/filters.component';
import { ProductsService } from '../../core/services/products.service';
import { ProductComponent } from '../../core/components/product/product.component';
import { NicheProductsService } from '../../core/api/niche-products.service';
import { FlipbookComponent } from '../../core/components/flipbook/flipbook.component';

@Component({
  selector: 'app-niche-products',
  imports: [
    CommonModule,
    FormsModule,
    ProductComponent,
    FiltersComponent,
    RouterLink,
    FlipbookComponent
  ],
  templateUrl: './niche-products.component.html',
  styleUrl: './niche-products.component.scss'
})
export class NicheProductsComponent implements OnInit {
  categoryId!: string;
  nicheData: any;
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

  // Режим просмотра: 'cards' или 'flipbook'
  viewMode: 'cards' | 'flipbook' = 'cards';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nicheProductsService: NicheProductsService,
    private productsService: ProductsService,
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.categoryId = params.get('id')!;
      this.resetState();
      this.loadCategoryData();
      this.loadProducts();
    });

    // Отдельно подписываемся на queryParams для viewMode
    this.route.queryParams.subscribe((queryParams) => {
      this.handleViewModeFromUrl(queryParams);
    });
  }

  /**
   * Обрабатывает параметр viewMode из URL
   */
  handleViewModeFromUrl(queryParams: any): void {
    const urlViewMode = queryParams['viewMode'];
    
    if (urlViewMode && (urlViewMode === 'cards' || urlViewMode === 'flipbook')) {
      // Если в URL есть валидный viewMode, используем его
      if (this.viewMode !== urlViewMode) {
        this.viewMode = urlViewMode;
        // Сохраняем в localStorage как предпочтение пользователя
        localStorage.setItem('preferredViewMode', urlViewMode);
      }
    } else {
      // Если в URL нет viewMode, устанавливаем 'cards' по умолчанию
      // и обновляем URL с параметром
      this.updateUrlWithViewMode('cards');
    }
  }

  /**
   * Обновляет URL с параметром viewMode
   */
  updateUrlWithViewMode(mode: 'cards' | 'flipbook'): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { viewMode: mode },
      queryParamsHandling: 'merge', // сохраняем другие query параметры
      replaceUrl: true // заменяем в истории, чтобы не создавать лишних записей
    });
  }

  resetState(): void {
    this.nicheData = null;
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

    this.nicheProductsService
      .getNicheById(this.categoryId)
      .subscribe({
        next: (data: any) => {
          this.nicheData = data.data;
          console.log('nicheData', this.nicheData)
          console.log('subCategories', data.data?.subCategories)
          // this.filters = this.categoryData.properties
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
            field: 'ProductNiches.Id',
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

  // Метод для переключения режима просмотра
  setViewMode(mode: 'cards' | 'flipbook'): void {
    if (this.viewMode !== mode) {
      this.viewMode = mode;
      // Сохраняем предпочтения пользователя
      localStorage.setItem('preferredViewMode', mode);
      
      // Обновляем URL с новым режимом
      this.updateUrlWithViewMode(mode);
      
      // Если переключаемся на flipbook и данных нет, можно загрузить
      if (mode === 'flipbook' && !this.nicheData) {
        this.loadCategoryData();
      }
    }
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
    // Бесконечная прокрутка работает только в режиме карточек
    if (this.viewMode !== 'cards') return;
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