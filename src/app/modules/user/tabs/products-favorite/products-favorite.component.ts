import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProductComponent } from '../../../../core/components/product/product.component';
import { ProductFavoriteService } from '../../../../core/api/product-favorite.service';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { TitleComponent } from '../../../../core/components/title/title.component';

@Component({
  selector: 'app-products-favorite',
  standalone: true,
  imports: [CommonModule,
    ProductComponent,
    EmptyStateComponent,
    TitleComponent],
  templateUrl: './products-favorite.component.html',
  styleUrl: './products-favorite.component.scss',
})
export class ProductsFavoriteComponent implements OnInit {
  products: any[] = [];
  currentPage: number = 0;
  pageSize: number = 20;
  loading: boolean = false;
  totalItems: number = 0;

  private productFavoriteService = inject(ProductFavoriteService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadProducts();
  }

  hasMorePages(): boolean {
    if (this.totalItems === 0) return true;
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    return this.currentPage < totalPages;
  }

  loadProducts(): void {
    if (this.loading || !this.hasMorePages()) return;

    this.loading = true;

    this.productFavoriteService
      .getFavorites([], null, this.currentPage, this.pageSize)
      .subscribe({
        next: (res: any) => {
          if (res && Array.isArray(res.data)) {
            this.products = [...this.products, ...res.data];
          }
          if (res && typeof res.pageCount === 'number') {
            this.totalItems = res.pageCount;
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Ошибка при загрузке продуктов:', err);
          this.loading = false;
        },
      });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    if (
      scrollPosition >= pageHeight - 100 &&
      !this.loading &&
      this.products.length > 0 &&
      this.hasMorePages()
    ) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  goToCatalog(): void {
    this.router.navigate(['']);
  }
}