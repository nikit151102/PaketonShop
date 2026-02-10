import { Component, HostListener, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CarouselBannerComponent } from './components/carousel-banner/carousel-banner.component';
import { CategorySectionComponent } from '../../core/components/category-section/category-section.component';
import { CategoryService } from '../../core/services/category.service';
import { ProductComponent } from '../../core/components/product/product.component';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../core/services/products.service';
import { StorageUtils } from '../../../utils/storage.utils';
import { BusinessBlockComponent } from './components/business-block/business-block.component';
import { CompareCommonBtnComponent } from '../../core/components/compare-common-btn/compare-common-btn.component';
import { ScrollStateService, HomePageState } from '../../core/services/scroll-state.service';
import { RouteStateService } from '../../core/services/route-state.service';
import { Subject } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    CarouselBannerComponent,
    CategorySectionComponent,
    ProductComponent,
    BusinessBlockComponent,
    CompareCommonBtnComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  categories: any[] = [];
  products: any[] = [];
  loading: boolean = false;
  error: string = '';
  currentPage: number = 0;
  pageSize: number = 20;
  totalItems: number = 0;
  selectedCategory: string = '';
  
  private destroy$ = new Subject<void>();
  private isInitialLoad = true;
  private lastScrollPosition = 0;
  private hasSavedStateOnDestroy = false;

  constructor(
    private categoryService: CategoryService,
    private productsService: ProductsService,
    private scrollStateService: ScrollStateService,
    private routeStateService: RouteStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupRouterListener();
    this.loadCategories();
    
    // Проверяем, есть ли сохраненное состояние
    const savedState = this.scrollStateService.loadHomeState();
    
    if (savedState && this.scrollStateService.getIsRestoring()) {
      // Восстанавливаем из сохраненного состояния
      this.products = savedState.products || [];
      this.currentPage = savedState.currentPage || 0;
      this.totalItems = savedState.totalItems || 0;
      this.selectedCategory = savedState.selectedCategory || '';
      this.lastScrollPosition = savedState.scrollPosition || 0;
      this.isInitialLoad = false;
      console.log('Restored state from storage');
    } else {
      // Загружаем с нуля
      this.loadProducts();
    }
  }

  private setupRouterListener(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        // Если уходим с главной страницы
        if (event.urlAfterRedirects !== '/') {
          this.saveCurrentState(true); // Принудительно сохраняем при уходе
        }
      });
  }

  ngAfterViewInit(): void {
    // Восстанавливаем позицию скролла после отрисовки
    if (this.lastScrollPosition > 0) {
      // Ждем немного дольше для полной загрузки контента
      setTimeout(() => {
        const maxRetries = 5;
        let retryCount = 0;
        
        const tryRestoreScroll = () => {
          const pageHeight = document.documentElement.scrollHeight;
          console.log(`Restore attempt ${retryCount + 1}: pageHeight=${pageHeight}, target=${this.lastScrollPosition}`);
          
          // Проверяем, достаточно ли высоты страницы
          if (pageHeight > this.lastScrollPosition) {
            window.scrollTo({
              top: this.lastScrollPosition,
              behavior: 'auto'
            });
            console.log('Restored scroll position to', this.lastScrollPosition);
          } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(tryRestoreScroll, 200); // Повторяем каждые 200ms
          } else {
            console.warn('Could not restore scroll position - page height insufficient');
          }
        };
        
        tryRestoreScroll();
      }, 300); // Увеличиваем начальную задержку
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Сохраняем состояние перед уходом, если еще не сохранили
    if (!this.hasSavedStateOnDestroy) {
      this.saveCurrentState(true);
    }
  }

  private saveCurrentState(isExplicitSave: boolean = false): void {
    const state: HomePageState = {
      scrollPosition: window.scrollY,
      products: [...this.products],
      currentPage: this.currentPage,
      totalItems: this.totalItems,
      selectedCategory: this.selectedCategory,
      timestamp: Date.now()
    };
    
    if (isExplicitSave) {
      console.log('EXPLICIT SAVE - scrollPosition:', state.scrollPosition, 'URL:', window.location.href);
      this.hasSavedStateOnDestroy = true;
    }
    
    this.scrollStateService.saveHomeState(state);
  }

  loadCategories(): void {
    const cachedCategories = StorageUtils.getMemoryCache<any[]>('categories');

    if (cachedCategories) {
      this.categories = cachedCategories;
    } else {
      this.categoryService.getFirstLevelCategories()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.categories = res.data;
            StorageUtils.setMemoryCache('categories', res.data, 600);
          },
          error: (err) => {
            console.error('Error fetching categories:', err);
          },
        });
    }
  }

  loadProducts(): void {
    if (this.loading) return;

    // Пропускаем загрузку если уже восстановили продукты из кэша
    if (!this.isInitialLoad && this.products.length > 0) {
      this.isInitialLoad = true;
      return;
    }

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
      .getAll(filters, null, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          // Если это первая загрузка страницы, заменяем продукты
          if (this.currentPage === 0) {
            this.products = res.data;
          } else {
            // Иначе добавляем к существующим
            this.products = [...this.products, ...res.data];
          }
          
          this.totalItems = res.totalCount;
          this.loading = false;
          
          // После загрузки продуктов сохраняем состояние
          setTimeout(() => {
            this.saveCurrentState();
          }, 100);
        },
        error: (err) => {
          this.error = 'Произошла ошибка при загрузке продуктов';
          this.loading = false;
        },
      });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    // Сохраняем позицию скролла
    this.debounceSaveScroll();
    
    // Бесконечная прокрутка
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= pageHeight - 350 && !this.loading) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    // Сохраняем состояние при закрытии вкладки/обновлении
    this.saveCurrentState(true);
  }

  private saveScrollTimeout: any;
  private debounceSaveScroll(): void {
    clearTimeout(this.saveScrollTimeout);
    this.saveScrollTimeout = setTimeout(() => {
      this.saveCurrentState();
    }, 300);
  }

  onCategoryChange(categoryId: string): void {
    // Очищаем сохраненное состояние при изменении категории
    this.scrollStateService.clearHomeState();
    this.hasSavedStateOnDestroy = false;
    
    this.selectedCategory = categoryId;
    this.currentPage = 0;
    this.products = [];
    this.isInitialLoad = true; // Разрешаем новую загрузку
    
    this.loadProducts();
  }
}