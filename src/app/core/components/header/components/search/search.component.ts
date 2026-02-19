/* search.component.ts */
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of, tap } from 'rxjs';
import { ProductInstance, ProductsService, SearchRequest } from '../../../../services/products.service';
import { Router } from '@angular/router';

interface AutocompleteProduct {
  id: string;
  name: string;
  sku: string;
  image: string;
  price: number;
  inStock: boolean;
  category?: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('autocompleteDropdown') autocompleteDropdown!: ElementRef;
  @ViewChild('autocompleteList') autocompleteList!: ElementRef;
  
  // Состояние UI
  filtersOpen = false;
  isInputFocused = false;
  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';

  // Поиск
  searchQuery: string = '';
  private searchSubject = new Subject<string>();

  // Автокомплит
  autocompleteResults: AutocompleteProduct[] = [];
  totalAutocompleteResults = 0;
  hasMoreAutocomplete = true;
  private autocompletePage = 0;
  private readonly pageSize = 10;
  private scrollThreshold = 100; // пикселей до конца для загрузки
  
  // Фильтры
  filters = {
    inStock: false,
    priceMin: null as number | null,
    priceMax: null as number | null,
    freeDelivery: false,
    discountOnly: false,
    minRating: null as number | null,
  };

  // Бренды
  popularBrands = ['Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance'];
  selectedBrands: string[] = [];

  get hasActiveFilters(): boolean {
    return Object.values(this.filters).some(value => 
      value === true || (typeof value === 'number' && value !== null)
    ) || this.selectedBrands.length > 0;
  }

  constructor(
    private elementRef: ElementRef,
    private productsService: ProductsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.setupAutocomplete();
  }

  private setupAutocomplete() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.resetAutocomplete();
        this.isLoading = true;
      }),
      switchMap(query => {
        if (query.length < 2) {
          this.isLoading = false;
          return of(null);
        }

        const searchRequest: SearchRequest = {
          filters: [
            {
              field: 'searchQuery',
              values: [query],
              type: 0
            },
            ...this.buildFilterParams()
          ],
          page: 0,
          pageSize: this.pageSize
        };

        return this.productsService.searchAutocomplete(searchRequest).pipe(
          catchError(error => {
            console.error('Ошибка автокомплита:', error);
            this.errorMessage = 'Не удалось загрузить подсказки';
            this.isLoading = false;
            return of(null);
          })
        );
      })
    ).subscribe((response: any) => {
      this.isLoading = false;
      if (response?.data) {
        this.totalAutocompleteResults = response.total || response.data.length;
        this.autocompleteResults = this.mapAutocompleteResults(response.data);
        this.hasMoreAutocomplete = response.data.length === this.pageSize;
      }
    });
  }

  private resetAutocomplete() {
    this.autocompleteResults = [];
    this.autocompletePage = 0;
    this.hasMoreAutocomplete = true;
  }

  private buildFilterParams() {
    const filters = [];
    
    if (this.filters.inStock) {
      filters.push({
        field: 'inStock',
        values: ['true'],
        type: 0
      });
    }

    if (this.filters.discountOnly) {
      filters.push({
        field: 'discount',
        values: ['true'],
        type: 0
      });
    }

    if (this.filters.priceMin !== null) {
      filters.push({
        field: 'priceMin',
        values: [this.filters.priceMin.toString()],
        type: 0
      });
    }

    if (this.filters.priceMax !== null) {
      filters.push({
        field: 'priceMax',
        values: [this.filters.priceMax.toString()],
        type: 0
      });
    }

    if (this.selectedBrands.length > 0) {
      filters.push({
        field: 'brands',
        values: this.selectedBrands,
        type: 0
      });
    }

    if (this.filters.minRating !== null) {
      filters.push({
        field: 'minRating',
        values: [this.filters.minRating.toString()],
        type: 0
      });
    }

    return filters;
  }

  private mapAutocompleteResults(products: any[]): AutocompleteProduct[] {
    return products.map(product => ({
      id: product.id,
      name: product.fullName || product.name,
      sku: product.article || product.sku,
      image: this.getProductImage(product),
      price: product.price || 0,
      inStock: product.inStock || false,
      category: product.category?.name
    }));
  }

  private getProductImage(product: any): string {
    if (product.images?.length > 0) {
      return product.images[0].url;
    }
    // Генерируем плейсхолдер с первой буквой артикула
    const letter = product.article?.charAt(0) || 'P';
    return `https://via.placeholder.com/60x60/327120/ffffff?text=${letter}`;
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'https://via.placeholder.com/60x60/e2e8f0/64748b?text=No+Image';
  }

  // Кастомный скролл для подгрузки
  onAutocompleteScroll(event: Event) {
    if (!this.hasMoreAutocomplete || this.isLoadingMore) return;

    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollHeight - element.scrollTop - element.clientHeight;
    
    if (scrollPosition < this.scrollThreshold) {
      this.loadMoreAutocomplete();
    }
  }

  // Загрузка дополнительных результатов
  loadMoreAutocomplete() {
    if (!this.hasMoreAutocomplete || this.isLoadingMore || this.searchQuery.length < 2) {
      return;
    }

    this.isLoadingMore = true;
    this.autocompletePage++;

    const searchRequest: SearchRequest = {
      filters: [
        {
          field: 'searchQuery',
          values: [this.searchQuery],
          type: 0
        },
        ...this.buildFilterParams()
      ],
      page: this.autocompletePage,
      pageSize: this.pageSize
    };

    this.productsService.searchAutocomplete(searchRequest).subscribe({
      next: (response) => {
        if (response?.data) {
          const newResults = this.mapAutocompleteResults(response.data);
          this.autocompleteResults = [...this.autocompleteResults, ...newResults];
          this.hasMoreAutocomplete = response.data.length === this.pageSize;
        }
        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки автокомплита:', error);
        this.isLoadingMore = false;
        this.autocompletePage--;
        this.errorMessage = 'Ошибка при загрузке';
        
        // Скрываем ошибку через 3 секунды
        setTimeout(() => {
          this.errorMessage = '';
        }, 3000);
      }
    });
  }

  // Валидация цены
  validatePrice(type: 'min' | 'max') {
    if (type === 'min' && this.filters.priceMin && this.filters.priceMax) {
      if (this.filters.priceMin > this.filters.priceMax) {
        this.filters.priceMin = this.filters.priceMax;
      }
    }
    
    if (type === 'max' && this.filters.priceMax && this.filters.priceMin) {
      if (this.filters.priceMax < this.filters.priceMin) {
        this.filters.priceMax = this.filters.priceMin;
      }
    }

    // Ограничение отрицательных значений
    if (this.filters.priceMin && this.filters.priceMin < 0) {
      this.filters.priceMin = 0;
    }
    if (this.filters.priceMax && this.filters.priceMax < 0) {
      this.filters.priceMax = 0;
    }
  }

  toggleBrand(brand: string) {
    const index = this.selectedBrands.indexOf(brand);
    if (index === -1) {
      this.selectedBrands.push(brand);
    } else {
      this.selectedBrands.splice(index, 1);
    }
  }

  toggleFilters() {
    this.filtersOpen = !this.filtersOpen;
    if (this.filtersOpen) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeFilters() {
    this.filtersOpen = false;
    document.body.style.overflow = '';
  }

  applyFilters() {
    console.log('Фильтры применены:', this.filters, this.selectedBrands);
    
    // Сбрасываем автокомплит и запускаем новый поиск
    this.resetAutocomplete();
    this.performSearch();
    this.closeFilters();
    
    // Показываем уведомление о примененных фильтрах
    this.showNotification('Фильтры применены');
  }

  resetFilters() {
    this.filters = {
      inStock: false,
      priceMin: null,
      priceMax: null,
      freeDelivery: false,
      discountOnly: false,
      minRating: null,
    };
    this.selectedBrands = [];
    
    // Сбрасываем автокомплит и запускаем поиск без фильтров
    this.resetAutocomplete();
    this.performSearch();
    this.showNotification('Фильтры сброшены');
  }

  private showNotification(message: string) {
    // Здесь можно добавить уведомление
    console.log(message);
  }

  clearSearch() {
    this.searchQuery = '';
    this.resetAutocomplete();
    this.searchSubject.next('');
    this.searchInput.nativeElement.focus();
  }

  onSearch() {
    this.searchSubject.next(this.searchQuery);
  }

  onInputFocus() {
    this.isInputFocused = true;
  }

  onInputBlur() {
    // Задержка для возможности клика по автокомплиту
    setTimeout(() => {
      if (!this.isElementFocused(this.autocompleteDropdown?.nativeElement)) {
        this.isInputFocused = false;
      }
    }, 200);
  }

  private isElementFocused(element: HTMLElement): boolean {
    return element?.contains(document.activeElement) || false;
  }

  // Обработчик скролла инпута (для мобильных устройств)
  onInputScroll() {
    // Можно добавить логику при скролле
  }

  performSearch() {
    if (!this.searchQuery.trim()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.autocompleteResults = [];

    const searchRequest: SearchRequest = {
      filters: [
        {
          field: 'searchQuery',
          values: [this.searchQuery],
          type: 0
        },
        ...this.buildFilterParams()
      ],
      page: 0,
      pageSize: 20
    };

    this.productsService.searchProducts(searchRequest).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        // Навигация на страницу результатов
        this.router.navigate(['/search'], {
          queryParams: { 
            q: this.searchQuery,
            ...this.getFilterParams()
          }
        });
        
        // Показываем количество результатов
        if (response.total) {
          this.showNotification(`Найдено ${response.total} товаров`);
        }
      },
      error: (error: any) => {
        console.error('Ошибка поиска:', error);
        this.errorMessage = 'Ошибка при выполнении поиска';
        this.isLoading = false;
        
        // Автоматически скрываем ошибку
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  private getFilterParams() {
    const params: any = {};
    if (this.filters.inStock) params.inStock = true;
    if (this.filters.priceMin) params.priceMin = this.filters.priceMin;
    if (this.filters.priceMax) params.priceMax = this.filters.priceMax;
    if (this.filters.discountOnly) params.discount = true;
    if (this.filters.freeDelivery) params.freeDelivery = true;
    if (this.filters.minRating) params.minRating = this.filters.minRating;
    if (this.selectedBrands.length) params.brands = this.selectedBrands.join(',');
    return params;
  }

  selectItem(item: AutocompleteProduct) {
    this.searchQuery = item.name;
    this.autocompleteResults = [];
    this.router.navigate(['/product', item.id]);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!event.target) return;

    const target = event.target as HTMLElement;
    
    // Не закрываем при клике на элементы автокомплита или фильтров
    if (target.closest('.autocomplete-item') || 
        target.closest('.search-bar__input') ||
        target.closest('.search-bar__submit') ||
        target.closest('.search-bar__filter') ||
        target.closest('.filters-panel')) {
      return;
    }

    // Закрываем автокомплит при клике вне компонента
    if (!this.elementRef.nativeElement.contains(target)) {
      this.autocompleteResults = [];
      this.isInputFocused = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.closeFilters();
    this.autocompleteResults = [];
    this.isInputFocused = false;
  }

  @HostListener('window:resize')
  onResize() {
    // Закрываем фильтры на десктопе при изменении размера
    if (window.innerWidth > 768 && this.filtersOpen) {
      this.closeFilters();
    }
  }

  ngOnDestroy() {
    // Очищаем подписки
    this.searchSubject.complete();
    document.body.style.overflow = '';
  }
}