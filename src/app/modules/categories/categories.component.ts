import { Component, HostListener, OnInit } from '@angular/core';
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

  constructor(
    private route: ActivatedRoute,
    private categoryService: CategoryService,
    private productsService: ProductsService,
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
          // ВАЖНО: loadProducts() теперь вызывается внутри loadCategoryData() 
          // после успешного получения хлебных крошек
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
          
          // Задаем стартовый индекс (предпоследний элемент, так как последний — это текущая категория)
          // Если крошек нет или только 1 элемент, индекс будет -1
          this.currentBreadCrumbIndex = this.breadCrumbs.length > 0 ? this.breadCrumbs.length - 2 : -1;
          
          // Запускаем загрузку товаров ТОЛЬКО после того, как узнали структуру хлебных крошек
          this.loadProducts();
        },
        error: (err) => { 
          this.error = 'Ошибка загрузки категории';
          this.loadProducts(); // Всё равно пытаемся загрузить товары
        }
      });
  }

  private breadCrumbs: Array<{ id: string; name: string }> = [];
  private currentBreadCrumbIndex: number = -1; // -1 = текущая категория, 0+ = родительские
  private isBreadCrumbsLoading: boolean = false;

  loadProducts(): void {
    if (this.loading || this.loadingMore) return;

    this.loadingMore = true;

    // 🔹 Определяем, из какой категории грузим
    const currentCategoryId = this.getEffectiveCategoryId();

    const baseFilters = currentCategoryId
      ? [
        {
          field: "Text",
          values: [],
          type: 0
        },
        {
          field: 'ProductCategories.Id',
          values: [currentCategoryId],
          type: 11,
        },
      ]
      : [];

    const allFilters = (this.categoryId === 'search') ?
      [...this.appliedFilters, {
        field: "searchQuery",
        values: [this.searchQuery],
        type: 0
      }] :
      [...baseFilters, ...this.appliedFilters];

    this.productsService
      .getAllSearch(allFilters, null, this.currentPage, this.pageSize)
      .subscribe({
        next: (res) => {
          const loadedProducts = res.data || [];


          // 🔹 Добавляем товары в общий список
          this.products = [...this.products, ...loadedProducts];

          // 🔹 Обновляем метаданные только для текущей категории
          this.totalItems = res.totalCount;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);

          this.loading = false;
          this.loadingMore = false;

          console.log(`🔹 Категория ID: ${currentCategoryId || 'null'}`);
          console.log(`🔹 Страница: ${this.currentPage} из ${res.pageCount} (totalCount: ${this.totalItems})`);
          console.groupEnd();
          // 🔹 Проверяем, закончилась ли текущая категория:
          // 1. Получили меньше товаров, чем pageSize — значит, это последняя страница
          // 2. Или получили 0 товаров — категория пуста
          const isCurrentCategoryExhausted = loadedProducts.length === 0 || loadedProducts.length < this.pageSize;

          if (isCurrentCategoryExhausted) {
            // 🔹 Категория закончилась — пробуем переключиться на родительскую
            this.trySwitchToNextBreadCrumb();
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
    console.groupCollapsed(`🔁 Проверка родительских категорий`);
    console.log(`🔹 breadCrumbs:`, this.breadCrumbs.map(bc => ({ id: bc.id, name: bc.name })));
    console.log(`🔹 currentBreadCrumbIndex: ${this.currentBreadCrumbIndex}`);
    console.groupEnd();

    // Если мы только что закончили основную категорию и еще не начинали обход крошек
    if (!this.isBreadCrumbsLoading) {
      if (this.breadCrumbs.length === 0 || this.currentBreadCrumbIndex < 0) {
        this.totalItems = Infinity;
        return;
      }
      // Индекс уже был установлен в loadCategoryData (length - 2). 
      // Просто активируем флаг, что мы начали обход родительских категорий.
      this.isBreadCrumbsLoading = true;
    } else {
      // Если мы уже в процессе обхода крошек, переходим на следующий элемент СНЗУ ВВЕРХ (уменьшаем индекс)
      this.currentBreadCrumbIndex--;
    }

    // Проверяем, не вышли ли за границы массива (все родительские категории загружены)
    if (this.currentBreadCrumbIndex < 0) {
      this.totalItems = Infinity;
      this.isBreadCrumbsLoading = false;
      console.log(`✅ Все родительские категории загружены. Итоговое количество товаров: ${this.products.length}`);
      return;
    }

    const nextCategory = this.breadCrumbs[this.currentBreadCrumbIndex];

    if (!nextCategory?.id) {
      console.warn(`⚠️ Неверный индекс хлебной крошки: ${this.currentBreadCrumbIndex}`);
      this.trySwitchToNextBreadCrumb(); // Рекурсивно пробуем следующий
      return;
    }

    console.log(`🔄 Переключаемся на родительскую категорию: "${nextCategory.name}" (ID: ${nextCategory.id})`);

    this.currentPage = 1; // Сбрасываем страницу для новой категории
    this.loadProducts();
  }

  private getEffectiveCategoryId(): string | null {
    if (this.categoryId === 'search') return null;

    // Если идет загрузка из родительских категорий
    if (this.isBreadCrumbsLoading && this.currentBreadCrumbIndex >= 0 && this.currentBreadCrumbIndex < this.breadCrumbs.length) {
      return this.breadCrumbs[this.currentBreadCrumbIndex].id;
    }

    // Иначе грузим из текущей категории
    return this.categoryId;
  }


  /**
   * 🔹 Проверяет, закончились ли товары в текущей категории,
   * и если да — переключается на следующую родительскую категорию
   */
  private checkAndLoadNextBreadCrumb(): void {
    // Если ещё есть страницы в текущей категории — ничего не делаем
    if (this.products.length < this.totalItems) return;

    // Если нет хлебных крошек или уже все прошли — заканчиваем
    if (this.breadCrumbs.length === 0 || this.currentBreadCrumbIndex < 0) return;

    // 🔹 Переключаемся на следующую родительскую категорию
    this.currentBreadCrumbIndex--;

    if (this.currentBreadCrumbIndex >= 0) {
      // Есть ещё родительская категория для загрузки
      this.isBreadCrumbsLoading = true;
      this.currentPage = 0; // 🔹 Обнуляем страницу для новой категории
      this.loadProducts(); // Рекурсивно загружаем товары из родительской категории
    }
    // Если currentBreadCrumbIndex < 0 — все категории загружены, останавливаемся
  }

  onFiltersChange(filters: any[]): void {
    this.appliedFilters = filters;
    this.currentPage = 0;
    this.loadProducts();
  }

  applyFilters(): void {
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
    // Если totalItems === Infinity, значит все родительские категории уже пройдены
    if (this.loading || this.loadingMore || this.totalItems === Infinity) return;

    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const triggerPosition = pageHeight - 500;

    if (scrollPosition >= triggerPosition) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  nextPage(): void {
    // Проверяем по номеру страницы, а не по количеству товаров
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