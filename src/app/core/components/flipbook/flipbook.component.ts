import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, Input, ViewChild, OnInit, OnChanges, SimpleChanges, inject, NgZone } from '@angular/core';
import { PageFlip } from 'page-flip';
import { ProductsService } from '../../services/products.service';
import { take } from 'rxjs';
import { localStorageEnvironment } from '../../../../environment';
import { StorageUtils } from '../../../../utils/storage.utils';
import { BasketsService } from '../../api/baskets.service';
import { AuthService } from '../../services/auth.service';
import { UserApiService } from '../../api/user.service';
import { FormsModule } from '@angular/forms';

interface Product {
  id?: string;
  icon: string;
  name: string;
  model: string;
  price: string;
  numericPrice?: number;
  inStock: boolean;
  imageUrl?: string;
  quantity?: number; 
}

interface SubCategory {
  id: string;
  name: string;
  imageInstanceLink: string | null;
  productCount?: number;
}

interface NicheData {
  id: string;
  name: string;
  code: string;
  description: string;
  imageInstanceLink: string | null;
  productCount: number;
}

@Component({
  selector: 'app-flipbook',
  templateUrl: './flipbook.component.html',
  styleUrls: ['./flipbook.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class FlipbookComponent implements AfterViewInit, OnInit, OnChanges {
  @ViewChild('flipbookContainer', { static: true }) flipbookContainer!: ElementRef<HTMLDivElement>;

  @Input() nicheData: NicheData | null = null;
  @Input() subCategories: SubCategory[] = [];

  private pageFlip!: PageFlip;
  private productsPerPage = 5;
  private loadedPages: Set<number> = new Set();
  private pageProducts: Map<number, Product[]> = new Map();
  private loadingPages: Set<number> = new Set();
  private isInitialized = false;
  private dataLoaded = false;
  private initInProgress = false;
  private resizeTimeout: any = null;
  private currentPageIndex = 0;
  private updateScheduled = false; // Флаг для отложенного обновления
  private preloadQueue: number[] = []; // Очередь предзагрузки

  // Состояния для корзины
  private isUserBasket: boolean = false;
  private activeBasketId: string | null = null;
  private baskets: any[] = [];
  
  // Маппинг для отслеживания количества товаров в корзине на каждой странице
  private pageQuantities: Map<number, Map<string, number>> = new Map();

  pages: (number | 'empty' | string)[] = ['empty', 'empty', 'content'];
  categories: { 
    startPage: number; 
    name: string; 
    subCategoryId: string; 
    pageCount: number;
    totalProducts?: number;
  }[] = [];
  
  currentPage = 0;
  private categoryProductCounts: Map<string, number> = new Map();
  private loadedCategories: Set<string> = new Set();

  // Инжекты
  private productsService = inject(ProductsService);
  private authService = inject(AuthService);
  private basketsService = inject(BasketsService);
  private userApiService = inject(UserApiService);
  private ngZone = inject(NgZone); // Добавляем NgZone для оптимизации

  constructor() { }

  ngOnInit() {
    this.loadBasketsData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['nicheData'] || changes['subCategories']) && this.hasValidData()) {
      this.dataLoaded = true;
      this.generatePagesFromData();
    }
  }

  ngAfterViewInit(): void {
    // Инициализация будет после загрузки данных
  }

  @HostListener('window:resize')
  onResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      if (this.pageFlip && this.hasValidData()) {
        this.currentPageIndex = this.pageFlip.getCurrentPageIndex();
        this.updatePageFlipSize();
      }
      this.resizeTimeout = null;
    }, 150);
  }

  ngOnDestroy() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    if (this.pageFlip) {
      try {
        this.pageFlip.destroy();
        this.isInitialized = false;
        this.initInProgress = false;
      } catch (e) {
        console.error('Error destroying PageFlip:', e);
      }
    }
  }

  // Загрузка данных о корзинах
  private loadBasketsData(): void {
    const baskets: any = StorageUtils.getMemoryCache('baskets');
    if (!baskets || !Array.isArray(baskets)) {
      this.isUserBasket = false;
      return;
    }

    this.isUserBasket = true;
    this.baskets = baskets;
    const activeBasket = baskets.find((basket: any) => basket.isActiveBasket === true);
    this.activeBasketId = activeBasket?.id ?? null;
  }

  // Проверка авторизации
  private checkAuth(): boolean {
    const authToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);
    
    if (!authToken) {
      this.authService.setRedirectingToProfile(false);
      this.authService.changeVisible(true);
      return false;
    }
    
    if (!this.isUserBasket) {
      this.authService.changeVisible(true);
      return false;
    }
    
    return true;
  }

  // Добавление одного товара в корзину
  addOneToCart(product: Product, pageIndex: number): void {
    if (!this.checkAuth() || !this.activeBasketId) return;

    this.basketsService
      .addProduct({ productId: product.id!, basketId: this.activeBasketId, count: 1 })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.updateProductQuantity(pageIndex, product.id!, 1);
          this.userApiService.getOperativeInfo();
          this.showNotification('Товар добавлен в корзину', 'success');
        },
        error: (err) => {
          console.error('Ошибка при добавлении товара', err);
          this.showNotification('Не удалось добавить товар', 'error');
        },
      });
  }

  // Увеличение количества
  increaseQty(product: Product, pageIndex: number): void {
    if (!this.checkAuth() || !this.activeBasketId) return;

    const currentQty = product.quantity || 0;
    const newQty = currentQty + 1;

    this.basketsService
      .addProduct({ productId: product.id!, basketId: this.activeBasketId, count: newQty })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.updateProductQuantity(pageIndex, product.id!, newQty);
        },
        error: (err) => console.error('Ошибка при увеличении количества', err),
      });
  }

  // Уменьшение количества
  decreaseQty(product: Product, pageIndex: number): void {
    if (!this.checkAuth() || !this.activeBasketId) return;

    const currentQty = product.quantity || 0;
    const newQty = currentQty - 1;

    if (newQty <= 0) {
      this.removeFromCart(product, pageIndex);
      return;
    }

    this.basketsService
      .addProduct({ productId: product.id!, basketId: this.activeBasketId, count: newQty })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.updateProductQuantity(pageIndex, product.id!, newQty);
        },
        error: (err) => console.error('Ошибка при уменьшении количества', err),
      });
  }

  // Обновление количества из инпута
  updateQtyFromInput(product: Product, pageIndex: number, event: any): void {
    if (!this.checkAuth() || !this.activeBasketId) return;

    const value = parseInt(event.target.value, 10);
    if (isNaN(value) || value < 1) return;

    this.basketsService
      .addProduct({ productId: product.id!, basketId: this.activeBasketId, count: value })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.updateProductQuantity(pageIndex, product.id!, value);
        },
        error: (err) => console.error('Ошибка при обновлении количества', err),
      });
  }

  // Удаление из корзины
  removeFromCart(product: Product, pageIndex: number): void {
    if (!this.checkAuth() || !this.activeBasketId) return;

    this.basketsService
      .changeProductFromBasket(this.activeBasketId, product.id!, 0)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.updateProductQuantity(pageIndex, product.id!, 0);
          this.showNotification('Товар удален из корзины', 'info');
        },
        error: (err) => console.error('Ошибка при удалении товара', err),
      });
  }

  // Обновление количества товара на странице
  private updateProductQuantity(pageIndex: number, productId: string, quantity: number): void {
    const products = this.pageProducts.get(pageIndex);
    if (!products) return;

    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return;

    products[productIndex].quantity = quantity > 0 ? quantity : undefined;
    
    // Обновляем маппинг количеств
    let pageMap = this.pageQuantities.get(pageIndex);
    if (!pageMap) {
      pageMap = new Map();
      this.pageQuantities.set(pageIndex, pageMap);
    }
    
    if (quantity > 0) {
      pageMap.set(productId, quantity);
    } else {
      pageMap.delete(productId);
    }

    // Не обновляем PageFlip при изменении корзины - только данные
  }

  // Получение количества товара в корзине
  getProductQuantity(product: Product): number {
    return product.quantity || 0;
  }

  // Проверка наличия товара в корзине
  isProductInCart(product: Product): boolean {
    return (product.quantity || 0) > 0;
  }

  // Показать уведомление
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    console.log(`[${type}] ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private hasValidData(): boolean {
    return this.subCategories && this.subCategories.length > 0;
  }

  get totalPages() {
    return this.pageFlip?.getPageCount() || this.pages.length;
  }

  get isFirstPage(): boolean {
    return this.pageFlip?.getCurrentPageIndex() === 0;
  }

  get isLastPage(): boolean {
    return this.pageFlip
      ? this.pageFlip.getCurrentPageIndex() === this.pageFlip.getPageCount() - 1
      : false;
  }

  getCategoryName(pageIndex: number): string {
    const category = this.categories.find(c =>
      pageIndex >= c.startPage && pageIndex < c.startPage + c.pageCount
    );
    return category?.name || 'Категория';
  }

  getCategoryClass(pageIndex: number): string {
    const name = this.getCategoryName(pageIndex).toLowerCase().replace(/\s+/g, '-');
    return `category-${name}`;
  }

  getProductsForPage(pageIndex: number): Product[] {
    return this.pageProducts.get(pageIndex) || this.getDefaultProducts('', this.productsPerPage);
  }

  flipPrev() {
    if (this.pageFlip) {
      this.pageFlip.flipPrev();
    }
  }

  flipNext() {
    if (this.pageFlip) {
      this.pageFlip.flipNext();
    }
  }

  goToPage(pageIndex: number) {
    if (this.pageFlip) {
      this.pageFlip.flip(pageIndex);
    }
  }

  isString(value: any): boolean {
    return typeof value === 'string';
  }

  isCategoryPage(page: any): boolean {
    return typeof page === 'string' && page.startsWith('category-');
  }

  private generatePagesFromData() {
    console.log('Generating pages with data:', this.subCategories);
    
    this.loadedPages.clear();
    this.pageProducts.clear();
    this.loadedCategories.clear();
    this.loadingPages.clear();
    this.preloadQueue = []; // Очищаем очередь предзагрузки
    
    this.pages = ['empty'];

    if (this.nicheData) {
      this.pages.push('cover');
    } else {
      this.pages.push('empty');
    }

    this.pages.push('content');

    let currentPage = 3;
    this.categories = [];
    this.loadedCategories.clear();
    
    this.subCategories.forEach((subCat) => {
      const totalProducts = subCat.productCount || 0;
      const pageCount = this.calculatePageCountForCategory(totalProducts);
      
      this.categories.push({
        startPage: currentPage,
        name: subCat.name,
        subCategoryId: subCat.id,
        pageCount: pageCount,
        totalProducts: totalProducts
      });

      for (let i = 0; i < pageCount; i++) {
        this.pages.push(`category-${subCat.id}-${i}`);
      }

      currentPage += pageCount;
    });

    this.pages.push('back-cover');
    this.pages.push('empty');
    this.loadBasketsData();
    
    console.log('Generated pages:', this.pages);
    console.log('Categories:', this.categories);

    setTimeout(() => {
      if (this.isInitialized && this.pageFlip) {
        this.recreatePageFlip();
      } else {
        this.initPageFlip();
      }
    }, 100);
  }

  private calculatePageCountForCategory(totalProducts: number): number {
    return Math.max(1, Math.ceil(totalProducts / this.productsPerPage));
  }

  private recreatePageFlip() {
    if (this.pageFlip) {
      try {
        this.pageFlip.destroy();
        this.isInitialized = false;
      } catch (e) {
        console.error('Error destroying PageFlip:', e);
      }
    }
    
    setTimeout(() => {
      this.initPageFlip();
    }, 200);
  }

  private updatePageFlipSize() {
    if (!this.pageFlip || !this.flipbookContainer) return;

    try {
      this.pageFlip.update();
      
      setTimeout(() => {
        if (this.pageFlip && this.currentPageIndex !== undefined) {
          this.pageFlip.flip(this.currentPageIndex);
        }
      }, 50);
    } catch (e) {
      console.error('Error updating PageFlip size:', e);
    }
  }

  // Оптимизированная загрузка товаров для страницы
  private loadProductsForPage(subCategoryId: string, pageIndex: number, pageNum: number) {
    if (this.loadingPages.has(pageNum) || this.loadedPages.has(pageNum)) {
      console.log(`Page ${pageNum} is already loading or loaded, skipping`);
      return;
    }

    this.loadingPages.add(pageNum);

    console.log(`Loading products for subCategory: ${subCategoryId}, pageIndex: ${pageIndex}, visual page: ${pageNum}`);

    const filters = [
      {
        field: "Text",
        values: [],
        type: 0
      },
      {
        field: 'ProductCategories.Id',
        values: [subCategoryId],
        type: 11,
      }
    ];

    this.productsService.getAllSearch(filters, null, pageIndex, this.productsPerPage)
      .subscribe({
        next: (res) => {
          console.log(`Loaded ${res.data.length} products for page ${pageNum} (pageIndex ${pageIndex})`);
          
          const products = res.data.map((item: any) => this.mapApiProductToLocal(item));

          // Сохраняем данные
          this.pageProducts.set(pageNum, products);
          this.loadedPages.add(pageNum);
          this.loadingPages.delete(pageNum);

          if (pageIndex === 0) {
            this.loadedCategories.add(subCategoryId);
          }

          // Планируем обновление PageFlip только если страница видима
          const currentPage = this.pageFlip?.getCurrentPageIndex() || 0;
          if (pageNum === currentPage || pageNum === currentPage + 1) {
            this.schedulePageFlipUpdate();
          }

          // Планируем предзагрузку следующей страницы
          this.schedulePreload(subCategoryId, pageIndex, pageNum);
        },
        error: (err) => {
          console.error('Error loading products:', err);
          this.loadingPages.delete(pageNum);
          this.pageProducts.set(pageNum, this.getDefaultProducts(subCategoryId, this.productsPerPage));
          this.loadedPages.add(pageNum);
          
          // Обновляем только если страница видима
          const currentPage = this.pageFlip?.getCurrentPageIndex() || 0;
          if (pageNum === currentPage || pageNum === currentPage + 1) {
            this.schedulePageFlipUpdate();
          }
        }
      });
  }

  // Планирование предзагрузки с задержкой
  private schedulePreload(subCategoryId: string, pageIndex: number, currentPageNum: number) {
    const nextPageNum = currentPageNum + 1;
    
    if (nextPageNum < this.pages.length) {
      const nextPageType = this.pages[nextPageNum];
      
      if (typeof nextPageType === 'string' && nextPageType.startsWith('category-')) {
        const match = nextPageType.match(/^category-(.+)-(\d+)$/);
        if (match && match[1] === subCategoryId) {
          const nextPageIndex = parseInt(match[2]);
          if (nextPageIndex === pageIndex + 1 && !this.preloadQueue.includes(nextPageNum)) {
            this.preloadQueue.push(nextPageNum);
            
            // Загружаем с задержкой, чтобы не блокировать анимацию
            setTimeout(() => {
              if (this.preloadQueue.includes(nextPageNum)) {
                this.preloadQueue = this.preloadQueue.filter(p => p !== nextPageNum);
                this.loadProductsForPage(subCategoryId, nextPageIndex, nextPageNum);
              }
            }, 500); // Задержка 500ms после завершения текущей загрузки
          }
        }
      }
    }
  }

  // Планирование обновления PageFlip
  private schedulePageFlipUpdate() {
    if (this.updateScheduled) return;
    
    this.updateScheduled = true;
    
    // Используем requestAnimationFrame для синхронизации с отрисовкой
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.ngZone.run(() => {
            if (this.pageFlip && this.hasValidData()) {
              try {
                // Обновляем только если страницы действительно изменились
                this.pageFlip.update();
              } catch (e) {
                console.error('Error updating PageFlip:', e);
              }
            }
            this.updateScheduled = false;
          });
        }, 100); // Небольшая задержка для завершения анимации
      });
    });
  }

  private mapApiProductToLocal(apiProduct: any): Product {
    return {
      id: apiProduct.id,
      name: apiProduct.fullName || 'Товар',
      model: apiProduct.article || '',
      price: apiProduct.viewPrice ? `${apiProduct.viewPrice} ₽` : 'Цена по запросу',
      numericPrice: apiProduct.viewPrice,
      inStock: apiProduct.inStock || apiProduct.quantity > 0 || false,
      icon: '📦',
      imageUrl: apiProduct.productImageLinks && apiProduct.productImageLinks[0] ? apiProduct.productImageLinks[0] : null,
      quantity: 0
    };
  }

  private getDefaultProducts(categoryId: string, count: number): Product[] {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      products.push({
        name: 'Загрузка...',
        model: 'Товар',
        price: '---',
        inStock: false,
        icon: '⏳',
        quantity: 0
      });
    }
    return products;
  }

  // Оптимизированная инициализация PageFlip
  private initPageFlip() {
    if (this.initInProgress || !this.hasValidData()) {
      console.log('Cannot init PageFlip: already in progress or no data');
      return;
    }

    this.initInProgress = true;

    const container = this.flipbookContainer.nativeElement;
    
    setTimeout(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const pages = container.querySelectorAll<HTMLElement>('.page');

      if (pages.length === 0) {
        console.error('No pages found for PageFlip');
        this.initInProgress = false;
        return;
      }

      console.log(`Initializing PageFlip with ${pages.length} pages`);

      try {
        // Оптимизированные настройки для плавности
        this.pageFlip = new PageFlip(container, {
          width,
          height,
          minWidth: 315,
          minHeight: 420,
          maxWidth: 1000,
          maxHeight: 1350,
          maxShadowOpacity: 0.2,
          flippingTime: 600, // Уменьшаем время для более отзывчивой анимации
          showCover: false,
          useMouseEvents: true,
          mobileScrollSupport: true,
          usePortrait: true,
          startPage: this.nicheData ? 2 : 1 // Начинаем с первой содержательной страницы
        });

        this.pageFlip.loadFromHTML(pages);
        this.isInitialized = true;
        this.initInProgress = false;

        this.pageFlip.on('flip', ({ data }) => {
          const currentPageNum = Number(data);
          this.currentPage = currentPageNum - 1;
          this.currentPageIndex = this.currentPage;
          
          console.log(`Flipped to page ${this.currentPage}`);
          
          // Загружаем текущую страницу, если нужно
          this.loadPageIfNeeded(this.currentPage);
          
          // Планируем предзагрузку соседних страниц с задержкой
          setTimeout(() => {
            this.preloadAdjacentPages(currentPageNum);
          }, 300);
        });

        // Загружаем первую страницу
        setTimeout(() => {
          if (this.pageFlip && this.pageFlip.getPageCount() > 1) {
            const firstContentPageIndex = this.nicheData ? 2 : 1;
            this.loadPageIfNeeded(firstContentPageIndex);
          }
        }, 200);
        
      } catch (error) {
        console.error('Error initializing PageFlip:', error);
        this.initInProgress = false;
      }
    }, 200);
  }

  private loadPageIfNeeded(pageNum: number) {
    if (pageNum >= this.pages.length) return;
    
    const pageType = this.pages[pageNum];
    if (typeof pageType === 'string' && pageType.startsWith('category-')) {
      const match = pageType.match(/^category-(.+)-(\d+)$/);
      if (match) {
        const subCategoryId = match[1];
        const pageIndex = parseInt(match[2]);
        
        if (!this.loadedPages.has(pageNum) && !this.loadingPages.has(pageNum)) {
          console.log(`Loading page ${pageNum} (${subCategoryId}, index ${pageIndex})`);
          this.loadProductsForPage(subCategoryId, pageIndex, pageNum);
        }
      }
    }
  }

  private preloadAdjacentPages(currentPageNum: number) {
    const pagesToPreload = [];
    
    // Предзагружаем следующую страницу (наиболее вероятная)
    if (currentPageNum + 1 < this.pages.length) {
      pagesToPreload.push(currentPageNum + 1);
    }
    
    // Предзагружаем следующую за следующей (если есть)
    if (currentPageNum + 2 < this.pages.length) {
      pagesToPreload.push(currentPageNum + 2);
    }

    // Загружаем страницы последовательно с небольшими задержками
    pagesToPreload.forEach((pageToLoad, index) => {
      setTimeout(() => {
        this.loadPageIfNeeded(pageToLoad);
      }, index * 200); // Задержка между загрузками
    });
  }

  private updatePageFlip() {
    // Этот метод оставляем для обратной совместимости, но используем schedulePageFlipUpdate
    this.schedulePageFlipUpdate();
  }
}