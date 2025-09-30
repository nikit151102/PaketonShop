import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ProductCardComponent } from './product-card/product-card.component';
import { ActivatedRoute } from '@angular/router';
import { ProductsService } from '../../core/services/products.service';
import { QuestionsComponent } from './questions/questions.component';
import { ReviewsComponent } from './reviews/reviews.component';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, QuestionsComponent, ReviewsComponent],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class CardComponent {

  activeTab: 'description' | 'features' | 'reviews' | 'questions' = 'description';
  productData: any;
  setTab(tab: 'description' | 'features' | 'reviews' | 'questions') {
    this.activeTab = tab;
  }

  constructor(
    private route: ActivatedRoute,
    private productsService: ProductsService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.loadData(params.get('id')!);
    });

  }

  loadData(id: string) {
    this.productsService.getById(id).subscribe((values: any) => {
      this.productData = values.data;
    });
  }

}