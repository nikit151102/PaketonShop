import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, Input, ViewChild, OnInit, OnChanges, SimpleChanges, inject, NgZone, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { PageFlip } from 'page-flip';
import { ProductsService } from '../../services/products.service';
import { Subject, take, takeUntil, debounceTime, distinctUntilChanged, throttleTime } from 'rxjs';
import { localStorageEnvironment, memoryCacheEnvironment } from '../../../../environment';
import { StorageUtils } from '../../../../utils/storage.utils';
import { BasketsService } from '../../api/baskets.service';
import { AuthService } from '../../services/auth.service';
import { UserApiService } from '../../api/user.service';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Interfaces
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
  backgroundImageLink: string | null;
}

interface NicheData {
  id: string;
  name: string;
  code: string;
  description: string;
  imageInstanceLinks: string | null;
  productCount: number;
}

interface ContentPage {
  items: {
    name: string;
    startPage: number;
    categoryId: string;
  }[];
  pageNumber: number;
}

interface CategoryInfo {
  startPage: number;
  name: string;
  subCategoryId: string;
  pageCount: number;
  totalProducts?: number;
}

// Constants
const CONSTANTS = {
  PRODUCTS_PER_PAGE: 5,
  CONTENT_ITEMS_PER_PAGE: 15,
  MAX_PRELOAD_PAGES: 2,
  PRELOAD_RADIUS: 2,
  FLIP_DEBOUNCE: 300,
  URL_UPDATE_DELAY: 300,
  RESIZE_DELAY: 250,
  INIT_DELAY: 200,
  PRELOAD_DELAY: 800,
  NOTIFICATION_DURATION: 3000,
  ANIMATION_DURATION: 300
} as const;

@Component({
  selector: 'app-flipbook',
  templateUrl: './flipbook.component.html',
  styleUrls: ['./flipbook.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlipbookComponent implements AfterViewInit, OnInit, OnChanges, OnDestroy {
  @ViewChild('flipbookContainer', { static: true }) flipbookContainer!: ElementRef<HTMLDivElement>;
  @Input() nicheData: NicheData | null = null;
  @Input() subCategories: SubCategory[] = [];

  pages: (number | 'empty' | string)[] = ['empty', 'empty'];
  categories: CategoryInfo[] = [];
  contentPages: ContentPage[] = [];
  currentPage = 0;
  isVisible = true;

  private pageProductsCache = new Map<number, Product[]>();
  private pageCategoryCache = new Map<number, string>();
  private loadedCategories = new Set<string>();
  private loadedPages = new Set<number>();
  private loadingPages = new Set<number>();
  private preloadedPages = new Set<number>();
  private activeRequests = new Map<number, any>();
  private pageQuantities = new Map<number, Map<string, number>>();

  private activeBasketProducts = new Map<string, number>();
  private baskets: any[] = [];
  private activeBasketId: string | null = null;
  private basketLoaded = false;
  private isUserBasket = false;

  private pageFlip!: PageFlip;
  private isInitialized = false;
  private initInProgress = false;
  private updateScheduled = false;
  private dataLoaded = false;
  private currentPageIndex = 0;
  private pendingInitialPage: number | null = null;
  private lastFlipTime = 0;
  private resizeTimeout: any = null;
  private flipTimeout: any = null;
  private updateUrlTimeout: any = null;
  private observer: IntersectionObserver | null = null;
  private destroy$ = new Subject<void>();

  private productsService = inject(ProductsService);
  private authService = inject(AuthService);
  private basketsService = inject(BasketsService);
  private userApiService = inject(UserApiService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  get totalPages(): number {
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

  ngOnInit(): void {
    this.initQueryParamsSubscription();
    this.initIntersectionObserver();
    this.loadBasketsData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['nicheData'] || changes['subCategories']) && this.hasValidData()) {
      this.dataLoaded = true;
      this.generatePagesFromData();
    }
  }

  ngAfterViewInit(): void { }

  @HostListener('window:resize')
  onResize(): void {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      if (this.pageFlip && this.hasValidData() && this.isVisible) {
        this.currentPageIndex = this.pageFlip.getCurrentPageIndex();
        this.updatePageFlipSize();
      }
      this.resizeTimeout = null;
    }, CONSTANTS.RESIZE_DELAY);
  }

  ngOnDestroy(): void {
    [this.resizeTimeout, this.flipTimeout, this.updateUrlTimeout].forEach(timeout => {
      if (timeout) clearTimeout(timeout);
    });

    this.observer?.disconnect();

    this.cancelAllRequests();

    if (this.pageFlip) {
      try {
        this.pageFlip.destroy();
      } catch (e) { }
    }

    this.destroy$.next();
    this.destroy$.complete();
    this.clearAllData();
  }

  getCategoryName(pageIndex: number): string {
    if (this.pageCategoryCache.has(pageIndex)) {
      return this.pageCategoryCache.get(pageIndex)!;
    }

    const category = this.categories.find(c =>
      pageIndex >= c.startPage && pageIndex < c.startPage + c.pageCount
    );
    const name = category?.name || 'Категория';
    this.pageCategoryCache.set(pageIndex, name);
    return name;
  }

  getCategoryClass(pageIndex: number): string {
    const name = this.getCategoryName(pageIndex).toLowerCase().replace(/\s+/g, '-');
    return `category-${name}`;
  }

  getCategoryBackground(pageIndex: number): string | null {
    const category = this.categories.find(c =>
      pageIndex >= c.startPage && pageIndex < c.startPage + c.pageCount
    );

    if (!category) return null;

    const subCategory = this.subCategories.find(sc => sc.id === category.subCategoryId);
    return subCategory?.backgroundImageLink || null;
  }

  getProductsForPage(pageIndex: number): Product[] {
    if (this.pageProductsCache.has(pageIndex)) {
      return this.pageProductsCache.get(pageIndex)!;
    }

    const products = this.getCachedProductsForPage(pageIndex);
    if (products) {
      this.pageProductsCache.set(pageIndex, products);
      return products;
    }

    return this.createDefaultProducts(this.productsPerPage);
  }

  getContentPage(pageIndex: number): ContentPage | null {
    const contentPageIndex = this.getContentPageIndex(pageIndex);
    return contentPageIndex >= 0 && contentPageIndex < this.contentPages.length
      ? this.contentPages[contentPageIndex]
      : null;
  }

  isContentPage(pageIndex: number): boolean {
    const pageType = this.pages[pageIndex];
    return pageType === 'content' || (typeof pageType === 'string' && pageType.startsWith('content-'));
  }

  isString(value: any): boolean {
    return typeof value === 'string';
  }

  isCategoryPage(page: any): boolean {
    return typeof page === 'string' && page.startsWith('category-');
  }

  flipPrev(): void {
    this.throttleFlip(() => this.pageFlip?.flipPrev());
  }

  flipNext(): void {
    this.throttleFlip(() => this.pageFlip?.flipNext());
  }

  goToPage(pageIndex: number): void {
    this.throttleFlip(() => this.pageFlip?.flip(pageIndex));

    setTimeout(() => {
      this.loadPageIfNeeded(pageIndex, false);
      this.preloadAdjacentPages(pageIndex + 1);
    }, CONSTANTS.FLIP_DEBOUNCE);
  }

  addOneToCart(product: Product, pageIndex: number): void {
    if (!this.checkAuth() || !this.activeBasketId) return;

    this.basketsService.addProduct({
      productId: product.id!,
      basketId: this.activeBasketId,
      count: 1
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.updateProductQuantity(pageIndex, product.id!, 1);
          this.activeBasketProducts.set(product.id!, 1);
          this.userApiService.getOperativeInfo();
          this.showNotification('Товар добавлен в корзину', 'success');
          this.cdr.detectChanges();
        },
        error: () => this.showNotification('Не удалось добавить товар', 'error')
      });
  }

  increaseQty(product: Product, pageIndex: number): void {
    this.updateQuantity(product, pageIndex, (product.quantity || 0) + 1);
  }

  decreaseQty(product: Product, pageIndex: number): void {
    const newQty = (product.quantity || 0) - 1;
    newQty <= 0
      ? this.removeFromCart(product, pageIndex)
      : this.updateQuantity(product, pageIndex, newQty);
  }

  updateQtyFromInput(product: Product, pageIndex: number, event: any): void {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      this.updateQuantity(product, pageIndex, value);
    }
  }

  removeFromCart(product: Product, pageIndex: number): void {
    if (!this.checkAuth() || !this.activeBasketId) return;

    this.basketsService.changeProductFromBasket(this.activeBasketId, product.id!, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.updateProductQuantity(pageIndex, product.id!, 0);
          this.activeBasketProducts.delete(product.id!);
          this.showNotification('Товар удален из корзины', 'info');
          this.cdr.detectChanges();
        },
        error: () => { }
      });
  }

  getProductQuantity(product: Product): number {
    return product.quantity || 0;
  }

  isProductInCart(product: Product): boolean {
    return (product.quantity || 0) > 0;
  }

  clearPageCache(pageNum?: number): void {
    if (pageNum !== undefined) {
      this.pageProductsCache.delete(pageNum);
      this.pageCategoryCache.delete(pageNum);
    } else {
      this.pageProductsCache.clear();
      this.pageCategoryCache.clear();
    }
  }

  private get productsPerPage(): number {
    return CONSTANTS.PRODUCTS_PER_PAGE;
  }

  private hasValidData(): boolean {
    return this.subCategories?.length > 0;
  }

  private initQueryParamsSubscription(): void {
    this.route.queryParams
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(CONSTANTS.URL_UPDATE_DELAY),
        distinctUntilChanged((prev, curr) => prev['page'] === curr['page'])
      )
      .subscribe(params => {
        if (params['page']) {
          const pageNum = parseInt(params['page'], 10);
          this.pendingInitialPage = !isNaN(pageNum) && pageNum > 0 ? pageNum : 1;
        } else {
          this.pendingInitialPage = 1;
        }
      });
  }

  private initIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.isVisible = entry.isIntersecting;
        if (!this.isVisible && this.pageFlip) {
          this.cancelAllRequests();
        }
      });
    });

    setTimeout(() => {
      if (this.flipbookContainer?.nativeElement) {
        this.observer?.observe(this.flipbookContainer.nativeElement);
      }
    }, 1000);
  }

  private generatePagesFromData(): void {
    this.clearAllData();
    this.buildPagesStructure();
    this.loadBasketsData();

    requestAnimationFrame(() => {
      setTimeout(() => {
        this.isInitialized && this.pageFlip
          ? this.recreatePageFlip()
          : this.initPageFlip();
      }, 100);
    });
  }

  private buildPagesStructure(): void {
    this.pages = [];
    this.contentPages = [];
    this.categories = [];

    if (this.nicheData) {
      this.pages.push('cover');
    }

    this.generateContentPages();

    let currentPage = this.pages.length;
    this.subCategories.forEach(subCat => {
      const totalProducts = subCat.productCount || 0;
      const pageCount = this.calculatePageCountForCategory(totalProducts);

      this.categories.push({
        startPage: currentPage,
        name: subCat.name,
        subCategoryId: subCat.id,
        pageCount,
        totalProducts
      });

      for (let i = 0; i < pageCount; i++) {
        this.pages.push(`category-${subCat.id}-${i}`);
      }

      currentPage += pageCount;
    });

    this.pages.push('back-cover');
  }

  private generateContentPages(): void {
    const contentItems = this.subCategories.map((subCat, index) => ({
      name: subCat.name,
      startPage: this.calculateCategoryStartPage(index),
      categoryId: subCat.id
    }));

    const pagesNeeded = Math.ceil(contentItems.length / CONSTANTS.CONTENT_ITEMS_PER_PAGE);

    for (let pageNum = 0; pageNum < pagesNeeded; pageNum++) {
      const startIdx = pageNum * CONSTANTS.CONTENT_ITEMS_PER_PAGE;
      const endIdx = Math.min(startIdx + CONSTANTS.CONTENT_ITEMS_PER_PAGE, contentItems.length);

      this.contentPages.push({
        items: contentItems.slice(startIdx, endIdx),
        pageNumber: pageNum + 1
      });

      this.pages.push(pageNum === 0 ? 'content' : `content-${pageNum}`);
    }
  }

  private calculateCategoryStartPage(categoryIndex: number): number {
    let startPage = 2;

    if (this.nicheData) {
      startPage++;
    }

    startPage += this.contentPages.length;

    for (let i = 0; i < categoryIndex; i++) {
      startPage += this.calculatePageCountForCategory(this.subCategories[i]?.productCount || 0);
    }

    return startPage;
  }

  private calculatePageCountForCategory(totalProducts: number): number {
    return Math.max(1, Math.ceil(totalProducts / this.productsPerPage));
  }

  private getContentPageIndex(pageIndex: number): number {
    const pageType = this.pages[pageIndex];
    if (pageType === 'content') return 0;

    if (typeof pageType === 'string' && pageType.startsWith('content-')) {
      const match = pageType.match(/^content-(\d+)$/);
      return match ? parseInt(match[1]) : -1;
    }

    return -1;
  }

  private getCachedProductsForPage(pageIndex: number): Product[] | undefined {
    return this.pageProductsCache.get(pageIndex);
  }

  private loadProductsForPage(
    subCategoryId: string,
    pageIndex: number,
    pageNum: number,
    isPreload = false
  ): void {
    if (this.shouldSkipLoading(pageNum, isPreload)) return;

    this.loadingPages.add(pageNum);
    if (isPreload) {
      this.preloadedPages.add(pageNum);
    }

    this.cancelRequestForPage(pageNum);

    const filters = [
      { field: "Text", values: [], type: 0 },
      { field: 'ProductCategories.Id', values: [subCategoryId], type: 11 }
    ];

    const subscription = this.productsService.getAllSearch(filters, null, pageIndex, this.productsPerPage)
      .pipe(takeUntil(this.destroy$), take(1))
      .subscribe({
        next: (res) => this.handleProductsResponse(res, pageNum, pageIndex, subCategoryId, isPreload),
        error: (err) => this.handleProductsError(pageNum, subCategoryId)
      });

    this.activeRequests.set(pageNum, subscription);
  }

  private shouldSkipLoading(pageNum: number, isPreload: boolean): boolean {
    const isLoading = this.loadingPages.has(pageNum);
    const isLoaded = this.loadedPages.has(pageNum);
    const tooManyRequests = this.loadingPages.size >= CONSTANTS.MAX_PRELOAD_PAGES &&
      !isLoaded && isPreload;

    return isLoading || isLoaded || tooManyRequests;
  }

  private handleProductsResponse(
    res: any,
    pageNum: number,
    pageIndex: number,
    subCategoryId: string,
    isPreload: boolean
  ): void {
    const products = res.data.map((item: any) => this.mapApiProductToLocal(item));
    const updatedProducts = this.mergeWithBasketQuantities(products);

    this.pageProductsCache.set(pageNum, updatedProducts);
    this.loadedPages.add(pageNum);
    this.cleanupLoadingState(pageNum);

    if (pageIndex === 0) {
      this.loadedCategories.add(subCategoryId);
    }

    this.triggerViewUpdateIfNeeded(pageNum);

    if (!isPreload && this.loadingPages.size < CONSTANTS.MAX_PRELOAD_PAGES) {
      this.scheduleNextPagePreload(subCategoryId, pageIndex, pageNum);
    }
  }

  private handleProductsError(pageNum: number, subCategoryId: string): void {
    this.cleanupLoadingState(pageNum);

    const defaultProducts = this.createDefaultProducts(this.productsPerPage);
    this.pageProductsCache.set(pageNum, defaultProducts);
    this.loadedPages.add(pageNum);

    this.triggerViewUpdateIfNeeded(pageNum);
  }

  private cleanupLoadingState(pageNum: number): void {
    this.loadingPages.delete(pageNum);
    this.activeRequests.delete(pageNum);
  }

  private mergeWithBasketQuantities(products: Product[]): Product[] {
    return products.map(product => {
      if (!product.id) return { ...product, quantity: 0 };

      const basketQuantity = this.activeBasketProducts.get(product.id);
      return {
        ...product,
        quantity: basketQuantity && basketQuantity > 0 ? basketQuantity : 0
      };
    });
  }

  private triggerViewUpdateIfNeeded(pageNum: number): void {
    const currentPage = this.pageFlip?.getCurrentPageIndex() || 0;
    if ((pageNum === currentPage || pageNum === currentPage + 1) && this.isVisible) {
      this.cdr.detectChanges();
      this.schedulePageFlipUpdate();
    }
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
      imageUrl: apiProduct.productImageLinks?.[0] || null,
      quantity: 0
    };
  }

  private createDefaultProducts(count: number): Product[] {
    return Array(count).fill(null).map(() => ({
      name: 'Загрузка...',
      model: 'Товар',
      price: '---',
      inStock: false,
      icon: '⏳',
      quantity: 0
    }));
  }

  private scheduleNextPagePreload(subCategoryId: string, pageIndex: number, currentPageNum: number): void {
    const nextPageNum = currentPageNum + 1;
    if (nextPageNum >= this.pages.length) return;

    const nextPageType = this.pages[nextPageNum];
    if (typeof nextPageType !== 'string' || !nextPageType.startsWith('category-')) return;

    const match = nextPageType.match(/^category-(.+)-(\d+)$/);
    if (!match || match[1] !== subCategoryId) return;

    const nextPageIndex = parseInt(match[2]);
    if (nextPageIndex === pageIndex + 1 &&
      !this.loadedPages.has(nextPageNum) &&
      !this.loadingPages.has(nextPageNum)) {
      setTimeout(() => {
        this.loadProductsForPage(subCategoryId, nextPageIndex, nextPageNum, true);
      }, CONSTANTS.PRELOAD_DELAY);
    }
  }

  private loadPageIfNeeded(pageNum: number, isFromUserAction = true): void {
    if (pageNum >= this.pages.length || !this.isVisible) return;

    const pageType = this.pages[pageNum];

    if (typeof pageType === 'string' && pageType.startsWith('category-')) {
      this.loadCategoryPage(pageType, pageNum, isFromUserAction);
    }
    else if (this.isContentPage(pageNum)) {
      this.preloadFirstCategoryPage(pageNum);
    }
  }

  private loadCategoryPage(pageType: string, pageNum: number, isFromUserAction: boolean): void {
    const match = pageType.match(/^category-(.+)-(\d+)$/);
    if (!match) return;

    const subCategoryId = match[1];
    const pageIndex = parseInt(match[2]);

    if (!this.loadedPages.has(pageNum) && !this.loadingPages.has(pageNum)) {
      this.loadProductsForPage(subCategoryId, pageIndex, pageNum, !isFromUserAction);
    }
  }

  private preloadFirstCategoryPage(contentPageNum: number): void {
    const nextCategoryPage = this.getNextCategoryPage(contentPageNum);
    if (nextCategoryPage === null) return;

    if (this.loadedPages.has(nextCategoryPage) || this.loadingPages.has(nextCategoryPage)) return;

    setTimeout(() => {
      const pageType = this.pages[nextCategoryPage];
      if (typeof pageType !== 'string' || !pageType.startsWith('category-')) return;

      const match = pageType.match(/^category-(.+)-(\d+)$/);
      if (!match) return;

      const subCategoryId = match[1];
      const pageIndex = parseInt(match[2]);

      if (pageIndex === 0) {
        this.loadProductsForPage(subCategoryId, pageIndex, nextCategoryPage, true);
      }
    }, CONSTANTS.FLIP_DEBOUNCE);
  }

  private getNextCategoryPage(currentPageNum: number): number | null {
    for (let i = currentPageNum + 1; i < this.pages.length; i++) {
      const pageType = this.pages[i];
      if (typeof pageType === 'string' && pageType.startsWith('category-')) {
        return i;
      }
      if (pageType === 'back-cover' || pageType === 'empty') break;
    }
    return null;
  }

  private preloadAdjacentPages(currentPageNum: number): void {
    if (!this.isVisible) return;

    const pagesToPreload: number[] = [];

    for (let i = 1; i <= CONSTANTS.PRELOAD_RADIUS; i++) {
      const nextPage = currentPageNum + i;
      if (nextPage >= this.pages.length) continue;

      if (this.isContentPage(nextPage)) {
        const nextCategoryPage = this.getNextCategoryPage(nextPage);
        if (nextCategoryPage !== null && !pagesToPreload.includes(nextCategoryPage)) {
          pagesToPreload.push(nextCategoryPage);
        }
      } else {
        pagesToPreload.push(nextPage);
      }
    }

    pagesToPreload.slice(0, CONSTANTS.MAX_PRELOAD_PAGES).forEach((pageToLoad, index) => {
      setTimeout(() => {
        this.loadPageIfNeeded(pageToLoad, false);
      }, index * CONSTANTS.FLIP_DEBOUNCE + 500);
    });
  }

  private throttleFlip(fn: () => void): void {
    const now = Date.now();
    if (now - this.lastFlipTime < CONSTANTS.FLIP_DEBOUNCE) return;

    this.lastFlipTime = now;

    if (this.flipTimeout) clearTimeout(this.flipTimeout);

    this.flipTimeout = setTimeout(() => {
      this.ngZone.runOutsideAngular(fn);
      this.flipTimeout = null;
    }, 10);
  }

  private updateUrlWithPageNumber(pageNumber: number): void {
    if (this.updateUrlTimeout) clearTimeout(this.updateUrlTimeout);

    this.updateUrlTimeout = setTimeout(() => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { page: pageNumber + 1 },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      this.updateUrlTimeout = null;
    }, CONSTANTS.URL_UPDATE_DELAY);
  }

  private initPageFlip(): void {
    if (this.initInProgress || !this.hasValidData() || !this.isVisible) return;

    this.initInProgress = true;
    const container = this.flipbookContainer.nativeElement;

    requestAnimationFrame(() => {
      setTimeout(() => {
        const pages = container.querySelectorAll<HTMLElement>('.page');

        if (pages.length === 0) {
          this.initInProgress = false;
          return;
        }

        try {
          this.pageFlip = new PageFlip(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            minWidth: 315,
            minHeight: 420,
            maxWidth: 1000,
            maxHeight: 1350,
            maxShadowOpacity: 0.15,
            flippingTime: 500,
            showCover: false,
            useMouseEvents: true,
            mobileScrollSupport: true,
            usePortrait: true,
            startPage: 0
          });

          this.pageFlip.loadFromHTML(pages);
          this.isInitialized = true;
          this.initInProgress = false;

          this.setupFlipListeners();
          this.handleInitialPage();

        } catch (error) {
          this.initInProgress = false;
        }
      }, CONSTANTS.INIT_DELAY);
    });
  }

  private setupFlipListeners(): void {
    let flipHandlerTimeout: any = null;

    this.pageFlip.on('flip', ({ data }) => {
      if (flipHandlerTimeout) clearTimeout(flipHandlerTimeout);

      flipHandlerTimeout = setTimeout(() => {
        const currentPageNum = Number(data);
        this.currentPage = currentPageNum;
        this.currentPageIndex = currentPageNum;

        this.updateUrlWithPageNumber(currentPageNum);
        this.loadPageIfNeeded(currentPageNum, false);

        setTimeout(() => this.preloadAdjacentPages(currentPageNum), 500);

        this.cdr.detectChanges();
        flipHandlerTimeout = null;
      }, 50);
    });
  }

  private handleInitialPage(): void {
    setTimeout(() => {
      if (!this.pageFlip || this.pageFlip.getPageCount() === 0 || !this.isVisible) return;

      if (this.pendingInitialPage) {
        this.goToInitialPage();
      } else {
        this.loadPageIfNeeded(0, false);
        this.updateUrlWithPageNumber(0);
      }
    }, CONSTANTS.FLIP_DEBOUNCE);
  }

  private goToInitialPage(): void {
    if (!this.pendingInitialPage || !this.pageFlip || !this.isVisible) return;

    const targetPage = this.pendingInitialPage - 1;

    if (targetPage >= 0 && targetPage < this.pageFlip.getPageCount()) {
      setTimeout(() => {
        this.pageFlip.flip(targetPage);
        setTimeout(() => {
          this.loadPageIfNeeded(targetPage, false);
          this.preloadAdjacentPages(targetPage);
        }, CONSTANTS.FLIP_DEBOUNCE);
      }, 500);
    } else {
      setTimeout(() => {
        this.pageFlip.flip(0);
        this.loadPageIfNeeded(0, false);
      }, 500);
    }

    this.pendingInitialPage = null;
  }

  private recreatePageFlip(): void {
    try {
      this.pageFlip?.destroy();
    } catch (e) { }

    this.isInitialized = false;
    setTimeout(() => this.initPageFlip(), CONSTANTS.FLIP_DEBOUNCE);
  }

  private updatePageFlipSize(): void {
    if (!this.pageFlip || !this.isVisible) return;

    try {
      this.pageFlip.update();
      setTimeout(() => {
        if (this.pageFlip && this.currentPageIndex !== undefined && this.isVisible) {
          this.pageFlip.flip(this.currentPageIndex);
        }
      }, 100);
    } catch (e) { }
  }

  private schedulePageFlipUpdate(): void {
    if (this.updateScheduled || !this.isVisible) return;

    this.updateScheduled = true;

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.ngZone.run(() => {
            try {
              this.pageFlip?.update();
            } catch (e) { }
            this.updateScheduled = false;
          });
        }, 150);
      });
    });
  }

  private loadBasketsData(): void {
    const baskets = StorageUtils.getMemoryCache('baskets');

    if (!baskets || !Array.isArray(baskets)) {
      this.isUserBasket = false;
      this.activeBasketId = null;
      this.loadBaskets();
      return;
    }

    this.isUserBasket = true;
    this.baskets = baskets;

    const activeBasket = baskets.find((basket: any) => basket.isActiveBasket);
    this.activeBasketId = activeBasket?.id ?? null;

    if (this.activeBasketId) {
      this.loadActiveBasketProducts();
    }
  }

  private loadBaskets(): void {
    this.basketsService.filterBaskets({
      filters: [],
      sorts: [],
      page: 0,
      pageSize: 10
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          StorageUtils.setMemoryCache(
            memoryCacheEnvironment.baskets.key,
            res.data,
            memoryCacheEnvironment.baskets.ttl
          );

          const activeBasket = res.data.find((basket: any) => basket.isActiveBasket);
          this.activeBasketId = activeBasket?.id ?? null;

          if (this.activeBasketId) {
            this.loadActiveBasketProducts();
          }
        },
        error: () => { }
      });
  }

  private loadActiveBasketProducts(): void {
    if (!this.activeBasketId) {
      this.activeBasketProducts.clear();
      this.basketLoaded = false;
      return;
    }

    this.basketsService.getBasketById(this.activeBasketId)
      .pipe(takeUntil(this.destroy$), take(1))
      .subscribe({
        next: (response: any) => {
          this.activeBasketProducts.clear();

          if (response?.data?.products) {
            response.data.products.forEach((item: any) => {
              if (item?.product?.id && item.count !== undefined) {
                this.activeBasketProducts.set(item.product.id, item.count);
              }
            });
          }

          this.basketLoaded = true;
          this.updateAllPagesWithBasketQuantities();
          this.cdr.detectChanges();
        },
        error: () => {
          this.activeBasketProducts.clear();
          this.basketLoaded = true;
        }
      });
  }

  private updateAllPagesWithBasketQuantities(): void {
    if (this.pageProductsCache.size === 0) return;

    let anyPageUpdated = false;

    this.pageProductsCache.forEach((products, pageNum) => {
      const updatedProducts = this.mergeWithBasketQuantities(products);

      if (JSON.stringify(products) !== JSON.stringify(updatedProducts)) {
        this.pageProductsCache.set(pageNum, updatedProducts);
        anyPageUpdated = true;
      }
    });

    if (anyPageUpdated) {
      this.cdr.detectChanges();
    }
  }

  private updateQuantity(product: Product, pageIndex: number, newQuantity: number): void {
    if (!this.checkAuth() || !this.activeBasketId) return;

    this.basketsService.addProduct({
      productId: product.id!,
      basketId: this.activeBasketId,
      count: newQuantity
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.updateProductQuantity(pageIndex, product.id!, newQuantity);
          this.activeBasketProducts.set(product.id!, newQuantity);
          this.cdr.detectChanges();
        },
        error: () => { }
      });
  }

  private updateProductQuantity(pageIndex: number, productId: string, quantity: number): void {
    const products = this.pageProductsCache.get(pageIndex);
    if (!products) return;

    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return;

    products[productIndex].quantity = quantity > 0 ? quantity : undefined;
    this.pageProductsCache.set(pageIndex, [...products]);

    let pageMap = this.pageQuantities.get(pageIndex);
    if (!pageMap) {
      pageMap = new Map();
      this.pageQuantities.set(pageIndex, pageMap);
    }

    quantity > 0
      ? pageMap.set(productId, quantity)
      : pageMap.delete(productId);

    if (this.pageFlip && this.isVisible) {
      const currentPage = this.pageFlip.getCurrentPageIndex();
      if (pageIndex === currentPage || pageIndex === currentPage + 1) {
        this.cdr.detectChanges();
      }
    }
  }

  private checkAuth(): boolean {
    const authToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);

    if (!authToken) {
      this.authService.setRedirectingToProfile(false);
      this.authService.changeVisible(true);
      return false;
    }

    if (!this.isUserBasket) {
      this.loadBaskets();
    }

    return true;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    console.log(`[${type}] ${message}`);

    requestAnimationFrame(() => {
      const notification = document.createElement('div');
      notification.className = `notification notification--${type}`;
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${this.getNotificationColor(type)};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn ${CONSTANTS.ANIMATION_DURATION}ms ease;
        pointer-events: none;
      `;

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.animation = `slideOut ${CONSTANTS.ANIMATION_DURATION}ms ease`;
        setTimeout(() => notification.remove(), CONSTANTS.ANIMATION_DURATION);
      }, CONSTANTS.NOTIFICATION_DURATION);
    });
  }

  private getNotificationColor(type: string): string {
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      info: '#2196f3'
    };
    return colors[type as keyof typeof colors] || colors.info;
  }

  private cancelAllRequests(): void {
    this.activeRequests.forEach(request => request?.unsubscribe?.());
    this.activeRequests.clear();
    this.loadingPages.clear();
  }

  private cancelRequestForPage(pageNum: number): void {
    const request = this.activeRequests.get(pageNum);
    if (request) {
      request.unsubscribe();
      this.activeRequests.delete(pageNum);
      this.loadingPages.delete(pageNum);
    }
  }

  private clearAllData(): void {
    this.loadedPages.clear();
    this.pageProductsCache.clear();
    this.pageCategoryCache.clear();
    this.loadedCategories.clear();
    this.loadingPages.clear();
    this.pageQuantities.clear();
    this.activeBasketProducts.clear();
    this.activeRequests.clear();
    this.preloadedPages.clear();
  }
}