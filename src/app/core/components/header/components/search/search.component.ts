import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of } from 'rxjs';
import { ProductInstance, ProductsService, SearchRequest } from '../../../../services/products.service';
import { Router } from '@angular/router';

interface AutocompleteProduct {
  id: string;
  name: string;
  sku: string;
  image: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit {
  @ViewChild('searchInput', { static: true }) searchInput!: ElementRef;
  
  filtersOpen = false;
  searchQuery: string = '';
  autocompleteResults: AutocompleteProduct[] = [];
  searchResults: ProductInstance[] = [];
  isLoading = false;
  errorMessage = '';
  isInputFocused = false;

  // Subject для debounce поиска
  private searchSubject = new Subject<string>();

  filters = {
    inStock: false,
    priceMin: null as number | null,
    priceMax: null as number | null,
    freeDelivery: false,
    discountOnly: false,
  };

  constructor(
    private elementRef: ElementRef,
    private productsService: ProductsService,
    private router: Router
  ) { }

  ngOnInit() {
    // Настройка debounce для поиска с автокомплитом
    this.searchSubject.pipe(
      debounceTime(300), // Задержка 300мс
      distinctUntilChanged(), // Только если значение изменилось
      switchMap(query => {
        if (query.length < 2) {
          this.autocompleteResults = [];
          return of(null);
        }
            const searchRequest: SearchRequest = {
      filters: [
        {'field': 'searchQuery',
          'values': [this.searchQuery],
          'type': 0
        }
      ],
      page: 0,
      pageSize: 20
    };
        return this.productsService.searchAutocomplete(searchRequest).pipe(
          catchError(error => {
            console.error('Ошибка автокомплита:', error);
            this.autocompleteResults = [];
            return of(null);
          })
        );
      })
    ).subscribe(response => {
      if (response?.data) {
        // Преобразуем результаты API в формат для автокомплита
        this.autocompleteResults = response.data.slice(0, 5).map(product => ({
          id: product.id,
          name: product.fullName,
          sku: product.article,
          image: this.getProductImage(product) // Метод для получения изображения
        }));
      }
    });
  }

  // Метод для получения изображения продукта (заглушка)
  private getProductImage(product: ProductInstance): string {
    // Здесь можно реализовать логику получения изображения
    // Например, из свойств или использовать дефолтное
    return 'https://via.placeholder.com/50x50?text=' + product.article.substring(0, 2);
  }

  toggleFilters() {
    this.filtersOpen = !this.filtersOpen;
  }

  applyFilters() {
    console.log('Фильтры применены:', this.filters);
    this.performSearch();
    this.filtersOpen = false;
  }

  resetFilters() {
    this.filters = {
      inStock: false,
      priceMin: null,
      priceMax: null,
      freeDelivery: false,
      discountOnly: false,
    };
    this.performSearch();
  }

  clearSearch() {
    this.searchQuery = '';
    this.autocompleteResults = [];
    this.searchResults = [];
  }

  // Вызывается при вводе в поле поиска
  onSearch() {
    this.searchSubject.next(this.searchQuery);
  }

  // Обработчик фокуса на поле ввода
  onInputFocus() {
    this.isInputFocused = true;
  }

  // Обработчик потери фокуса полем ввода
  onInputBlur() {
    // Небольшая задержка перед скрытием автокомплита,
    // чтобы дать время для клика по элементам автокомплита
    setTimeout(() => {
      this.isInputFocused = false;
      // Автокомплит скроется при клике вне компонента благодаря HostListener
    }, 200);
  }

  // Основной поиск с применением фильтров
  performSearch() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.autocompleteResults = []; // Закрываем автокомплит при основном поиске

    const searchRequest: SearchRequest = {
      filters: [
        {'field': 'searchQuery',
          'values': [this.searchQuery],
          'type': 0
        }
      ],
      page: 0,
      pageSize: 20
    };

    this.productsService.searchProducts(searchRequest).subscribe({
      next: (response: any) => {
        this.searchResults = response.data;
        this.isLoading = false;
        console.log('Результаты поиска:', response);
      },
      error: (error: any) => {
        console.error('Ошибка поиска:', error);
        this.errorMessage = 'Ошибка при выполнении поиска';
        this.isLoading = false;
      }
    });
  }

  // Старый метод для совместимости
  applySearch() {
    this.performSearch();
  }

  // Выбор элемента из автокомплита
  selectItem(item: AutocompleteProduct) {
    this.searchQuery = item.name;
    this.autocompleteResults = [];
    this.router.navigate(['/product',item.id])
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!event.target) {
      return;
    }

    const target = event.target as HTMLElement;
    
    // Проверяем, кликнули ли мы на элемент автокомплита
    const clickedOnAutocompleteItem = target.closest('.autocomplete-item') !== null;
    
    // Если кликнули на элемент автокомплита, ничего не делаем
    if (clickedOnAutocompleteItem) {
      return;
    }

    // Проверяем, кликнули ли мы на поле ввода
    const clickedOnSearchInput = target === this.searchInput.nativeElement || 
                                 this.searchInput.nativeElement.contains(target);
    
    // Проверяем, кликнули ли мы на кнопку поиска
    const clickedOnSearchBtn = target.closest('.search-btn') !== null;
    
    // Проверяем, кликнули ли мы на иконку поиска
    const clickedOnSearchIcon = target.closest('.fa-search') !== null;
    
    // Проверяем, кликнули ли мы внутри контейнера поиска
    const clickedInsideSearchContainer = target.closest('.positioned-wrapper') !== null;

    // Если клик был на кнопке фильтров, ничего не закрываем
    const clickedOnFilterBtn = target.closest('.filter-btn') !== null;

    if (clickedOnFilterBtn) {
      this.autocompleteResults = []; // Закрываем только автокомплит
      return;
    }

    // Если клик был на поле ввода, кнопке поиска или иконке, не закрываем автокомплит
    if (clickedOnSearchInput || clickedOnSearchBtn || clickedOnSearchIcon || clickedInsideSearchContainer) {
      // Не закрываем автокомплит при клике на элементы поиска
      return;
    }

    // Во всех остальных случаях закрываем автокомплит и фильтры
    this.autocompleteResults = [];
    
    // Закрываем фильтры только если клик был вне компонента
    const clickedInsideComponent = this.elementRef.nativeElement.contains(target);
    if (!clickedInsideComponent) {
      this.filtersOpen = false;
    }
  }

  // Дополнительный обработчик для клавиши пробела
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Если нажат пробел и фокус в поле ввода
    if (event.key === ' ' && document.activeElement === this.searchInput.nativeElement) {
      event.stopPropagation(); // Останавливаем всплытие, чтобы onClickOutside не сработал
    }
  }
}