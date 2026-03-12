import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProductComponent } from '../../../../core/components/product/product.component';
import { ProductFavoriteService } from '../../../../core/api/product-favorite.service';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';

@Component({
  selector: 'app-products-favorite',
  standalone: true,
  imports: [CommonModule, ProductComponent, EmptyStateComponent],
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

  loadProducts(): void {
    if (this.loading) return;

    this.loading = true;

    this.productFavoriteService
      .getFavorites([], null, this.currentPage, this.pageSize)
      .subscribe({
        next: (res) => {
          if (res && Array.isArray(res.data)) {
            this.products = [...this.products, ...res.data];
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

    if (scrollPosition >= pageHeight - 100 && !this.loading && this.products.length > 0) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  goToCatalog(): void {
    this.router.navigate(['']);
  }
}