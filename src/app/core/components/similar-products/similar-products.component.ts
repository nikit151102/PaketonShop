import { Component, inject, Input, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductComponent } from '../product/product.component';
import { ProductsService } from '../../services/products.service';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

@Component({
  selector: 'app-similar-products',
  standalone: true,
  imports: [CommonModule, ProductComponent],
  templateUrl: './similar-products.component.html',
  styleUrl: './similar-products.component.scss'
})
export class SimilarProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() categoryId: string = '';
  @Input() title: string = 'Похожие товары';
  @Input() limit: number = 20;

  @ViewChild('productsContainer') productsContainer!: ElementRef;

  products: any[] = [];
  isLoading = true;
  hasMore = true;
  currentPage = 0;  
  pageSize = 10;

  private scrollSubscription?: Subscription;
  private readonly CARD_WIDTH = 240;
  private readonly SCROLL_THRESHOLD = 150; 

  private productsService = inject(ProductsService);

  ngOnInit(): void {
    if (this.categoryId) {
      this.loadProducts(0); 
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initScrollListener(), 300);
  }

  scrollLeft(): void {
    const container = this.productsContainer?.nativeElement as HTMLElement;
    if (container) {
      container.scrollBy({ left: -this.CARD_WIDTH, behavior: 'smooth' });
    }
  }

  scrollRight(): void {
    const container = this.productsContainer?.nativeElement as HTMLElement;
    if (container) {
      container.scrollBy({ left: this.CARD_WIDTH, behavior: 'smooth' });
    }
  }

  trackByProduct(index: number, product: any): string {
    return product?.id || index.toString();
  }

  private loadProducts(page: number): void {
    this.isLoading = true;

    const filters = [
      { field: 'Text', values: [], type: 0 },
      { field: 'ProductCategories.Id', values: [this.categoryId], type: 11 }
    ];

    this.productsService.getAllSearch(filters, null, page, this.pageSize).subscribe({
      next: (res) => {
        const newProducts = res.data || [];

        if (page === 0) {
          this.products = newProducts;
        } else {
          this.products = [...this.products, ...newProducts];
        }

        this.hasMore = newProducts.length === this.pageSize;
        
        this.currentPage = page + 1;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.hasMore = false;
      }
    });
  }

  private initScrollListener(): void {
    const container = this.productsContainer?.nativeElement as HTMLElement;
    if (!container) {
      return;
    }

    const scroll$ = fromEvent(container, 'scroll').pipe(
      debounceTime(100), 
      throttleTime(200)
    );

    this.scrollSubscription = scroll$.subscribe(() => this.onScroll(container));
  }

  private onScroll(container: HTMLElement): void {
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    const remaining = scrollWidth - scrollLeft - clientWidth;
    
    if (remaining <= this.SCROLL_THRESHOLD && this.hasMore && !this.isLoading) {
      this.loadProducts(this.currentPage);
    }
    
  }

  ngOnDestroy(): void {
    this.scrollSubscription?.unsubscribe();
  }
}