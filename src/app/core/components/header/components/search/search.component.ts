import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of, tap, takeUntil } from 'rxjs';
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
export class SearchComponent implements OnInit, OnDestroy {
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
  private destroy$ = new Subject<void>();

  // Автокомплит
  autocompleteResults: AutocompleteProduct[] = [];
  totalAutocompleteResults = 0;
  hasMoreAutocomplete = true;
  private autocompletePage = 0;
  private readonly pageSize = 10;
  private scrollThreshold = 100; // пикселей до конца для загрузки
  private autocompleteScrollListener?: () => void;

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
  ) { }

  ngOnInit() {
    this.setupAutocomplete();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
    document.body.style.overflow = '';
    this.removeScrollListener();
  }

private setupAutocomplete() {
  this.searchSubject.pipe(
    debounceTime(300),
    // Убираем лишнюю проверку на пробелы
    distinctUntilChanged(), // Простое сравнение строк работает корректно
    tap((query) => {
      // Проверяем длину после trim, но запоминаем что ищем
      const trimmedQuery = query?.trim() || '';
      
      if (trimmedQuery.length >= 2 || query?.includes(' ')) {
        // Если есть пробелы или достаточно символов - ищем
        this.resetAutocomplete();
        this.isLoading = true;
        this.errorMessage = '';
      } else if (trimmedQuery.length === 0 && !query?.includes(' ')) {
        // Только если строка действительно пустая (не содержит пробелов)
        this.autocompleteResults = [];
        this.isLoading = false;
      }
      // Если есть пробелы, но мало символов - не очищаем результаты
    }),
    switchMap(query => {
      // Всегда передаём оригинальный query в сервис
      if (!query || (query.trim().length < 2 && !query.includes(' '))) {
        return of(null);
      }

      const searchRequest: SearchRequest = {
        filters: [
          {
            field: 'searchQuery',
            values: [query], // Используем оригинальный query с пробелами
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
    }),
    takeUntil(this.destroy$)
  ).subscribe((response: any) => {
    this.isLoading = false;
    if (response?.data) {
      this.totalAutocompleteResults = response.total || response.data.length;
      this.autocompleteResults = this.mapAutocompleteResults(response.data);
      this.hasMoreAutocomplete = response.data.length === this.pageSize;

      setTimeout(() => this.setupScrollListener(), 100);
    } else if (this.searchQuery?.includes(' ') && this.searchQuery.trim().length < 2) {
      // Если в строке только пробелы или пробел + 1 символ, показываем предыдущие результаты
      // или просто не очищаем
    }
  });
}

  private setupScrollListener() {
    this.removeScrollListener();

    const dropdown = this.autocompleteDropdown?.nativeElement;
    if (!dropdown) return;

    const onScroll = (event: Event) => {
      this.onAutocompleteScroll(event);
    };

    dropdown.addEventListener('scroll', onScroll, { passive: true });
    this.autocompleteScrollListener = () => dropdown.removeEventListener('scroll', onScroll);
  }

  private removeScrollListener() {
    if (this.autocompleteScrollListener) {
      this.autocompleteScrollListener();
      this.autocompleteScrollListener = undefined;
    }
  }

  private resetAutocomplete() {
    this.autocompleteResults = [];
    this.autocompletePage = 0;
    this.hasMoreAutocomplete = true;
    this.removeScrollListener();
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
    if (!this.hasMoreAutocomplete || this.isLoadingMore || !this.searchQuery) return;

    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollHeight - element.scrollTop - element.clientHeight;

    // Используем порог для более плавной загрузки
    if (scrollPosition < this.scrollThreshold) {
      this.loadMoreAutocomplete();
    }
  }

  // Загрузка дополнительных результатов
  loadMoreAutocomplete() {
    if (!this.hasMoreAutocomplete || this.isLoadingMore || !this.searchQuery) {
      return;
    }

    // Проверяем длину после trim для загрузки
    const trimmedQuery = this.searchQuery.trim();
    if (trimmedQuery.length < 2) {
      return;
    }

    this.isLoadingMore = true;
    const nextPage = this.autocompletePage + 1;

    const searchRequest: SearchRequest = {
      filters: [
        {
          field: 'searchQuery',
          values: [this.searchQuery], // Используем оригинальный запрос
          type: 0
        },
        ...this.buildFilterParams()
      ],
      page: nextPage,
      pageSize: this.pageSize
    };

    this.productsService.searchAutocomplete(searchRequest).pipe(
      catchError(error => {
        console.error('Ошибка загрузки автокомплита:', error);
        this.errorMessage = 'Ошибка при загрузке';
        this.isLoadingMore = false;

        setTimeout(() => {
          this.errorMessage = '';
        }, 3000);

        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe((response: any) => {
      this.isLoadingMore = false;

      if (response?.data) {
        const newResults = this.mapAutocompleteResults(response.data);
        this.autocompleteResults = [...this.autocompleteResults, ...newResults];
        this.hasMoreAutocomplete = response.data.length === this.pageSize;
        this.autocompletePage = nextPage;

        // Обновляем total, если пришло с сервера
        if (response.total) {
          this.totalAutocompleteResults = response.total;
        }
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
    } else {
      document.body.style.overflow = '';
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
  console.log('onSearch called with:', JSON.stringify(this.searchQuery));
  console.log('Input value after space:', this.searchInput?.nativeElement?.value);
  
  // Принудительно обновляем модель из DOM, если нужно
  if (this.searchInput && this.searchInput.nativeElement) {
    const domValue = this.searchInput.nativeElement.value;
    if (domValue !== this.searchQuery) {
      console.log('DOM value differs:', JSON.stringify(domValue));
      this.searchQuery = domValue;
    }
  }
  
  this.searchSubject.next(this.searchQuery);
}

  onInputFocus() {
    this.isInputFocused = true;

    // Если есть результаты и запрос, показываем их
    const trimmedQuery = this.searchQuery?.trim() || '';
    if (trimmedQuery.length >= 2 && this.autocompleteResults.length > 0) {
      setTimeout(() => this.setupScrollListener(), 100);
    }
  }

  onInputBlur() {
    // Задержка для возможности клика по автокомплиту
    setTimeout(() => {
      if (!this.isElementFocused(this.autocompleteDropdown?.nativeElement)) {
        this.isInputFocused = false;
        this.removeScrollListener();
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
    // Исправляем: учитываем пробелы в начале и конце
    const trimmedQuery = this.searchQuery?.trim();
    if (!trimmedQuery) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.autocompleteResults = [];

    const searchRequest: SearchRequest = {
      filters: [
        {
          field: 'searchQuery',
          values: [this.searchQuery], // Используем оригинальный запрос
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
            q: trimmedQuery,
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
    this.isInputFocused = false;
    this.removeScrollListener();
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
      this.removeScrollListener();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.closeFilters();
    this.autocompleteResults = [];
    this.isInputFocused = false;
    this.removeScrollListener();
  }

  @HostListener('window:resize')
  onResize() {
    // Закрываем фильтры на десктопе при изменении размера
    if (window.innerWidth > 768 && this.filtersOpen) {
      this.closeFilters();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    // Закрываем автокомплит при скролле страницы
    if (this.isInputFocused && this.autocompleteResults.length > 0) {
      this.autocompleteResults = [];
      this.isInputFocused = false;
      this.removeScrollListener();
    }
  }


}