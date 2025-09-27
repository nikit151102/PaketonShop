import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { ProductComponent } from '../../../../core/components/product/product.component';
import { ProductFavoriteService } from '../../../../core/api/product-favorite.service';

@Component({
  selector: 'app-products-favorite',
  imports: [CommonModule, ProductComponent],
  templateUrl: './products-favorite.component.html',
  styleUrl: './products-favorite.component.scss'
})
export class ProductsFavoriteComponent implements OnInit {

  products: any[] = [];
  currentPage: number = 0;
  pageSize: number = 20;
  loading: boolean = false;
  totalItems: number = 0;

  productFavoriteService = inject(ProductFavoriteService);

  ngOnInit(): void {
    this.loadProducts();
  }

 loadProducts(): void {
  if (this.loading) return;

  this.loading = true;

  const filters: any[] = [];

  this.productFavoriteService.getFavorites(filters, null, this.currentPage, this.pageSize).subscribe({
    next: (res) => {
      if (res && Array.isArray(res.data)) {
        this.products = [...this.products, ...res.data];
      } else {
        console.warn('Сервер вернул пустые данные или неверный формат:', res);
      }
      this.loading = false;
    },
    error: (err) => {
      console.error('Ошибка при загрузке продуктов:', err);
      this.loading = false;
    }
  });
}


  
  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= pageHeight - 100 && !this.loading) {
      this.currentPage++;
      this.loadProducts();
    }
  }

}
