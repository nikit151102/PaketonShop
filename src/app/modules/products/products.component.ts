import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductComponent } from '../../core/components/product/product.component';
import { ViewSwitcherComponent } from '../../core/ui/view-switcher/view-switcher.component';
import { ProductsService } from '../../core/services/products.service';
import { forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-products',
  imports: [CommonModule, ProductComponent, ViewSwitcherComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {

  products: any[] = [];
  currentView: 'compact' | 'wide' = 'compact';
  loading: boolean = false;
  currentPage: number = 0;
  pageSize: number = 20;
  totalItems: number = 0;
  selectedCategory: any


  constructor(
    private route: ActivatedRoute, 
    private productsService: ProductsService
  ) { }

  ngOnInit(): void {
     this.route.paramMap.subscribe(params => {
     this.loadData(params.get('id')!);
    });

    
  }

  loadData(categoryId: string): void {
    if (this.loading) return;

    this.loading = true;
    const filters = [{ field: 'ProductCategories.Id', values: [categoryId], type: 11 }];

    forkJoin({
      products: this.productsService.getAll(filters, null, this.currentPage, this.pageSize)
    }).subscribe({
      next: (res) => {
        this.products = this.products.concat(res.products.data);
        this.totalItems = res.products.totalCount;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  setView(view: 'compact' | 'wide') {
    this.currentView = view;
  }
}
