import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductCardComponent } from './product-card/product-card.component';
import { ActivatedRoute } from '@angular/router';
import { ProductsService } from '../../core/services/products.service';
import { QuestionsComponent } from './questions/questions.component';
import { ReviewsComponent } from './reviews/reviews.component';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [
    CommonModule,
    ProductCardComponent,
    QuestionsComponent,
    ReviewsComponent,
  ],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class CardComponent {
  activeTab: 'description' | 'features' | 'reviews' | 'questions' = 'description';
  productData: any;
  
  constructor(
    private route: ActivatedRoute,
    private productsService: ProductsService,
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.loadData(params.get('id')!);
    });
  }

  loadData(id: string) {
    this.productsService.getById(id).subscribe((values: any) => {
      this.productData = values.data;
    });
  }

  setTab(tab: 'description' | 'features' | 'reviews' | 'questions') {
    this.activeTab = tab;
  }

  // Получить характеристики продукта
  getProductSpecs() {
    return this.productData?.productProperties || [];
  }


  // Определить важность характеристики
  isImportantSpec(propertyName: string): boolean {
    const importantProperties = [
      'объем', 'вес', 'размер', 'материал', 'цвет',
      'мощность', 'емкость', 'производительность', 'гарантия',
      'цена', 'стоимость', 'тип', 'назначение'
    ];
    return importantProperties.some(prop => 
      propertyName.toLowerCase().includes(prop)
    );
  }

  // Копировать описание
  copyDescription(): void {
    if (!this.productData?.description) return;
    
    navigator.clipboard.writeText(this.productData.description)
      .then(() => {
        // Можно добавить временное уведомление
        console.log('Описание скопировано');
      })
      .catch(err => console.error('Ошибка копирования:', err));
  }

  // Действия с характеристиками
  printSpecs(): void {
    window.print();
  }

  shareSpecs(): void {
    if (navigator.share) {
      navigator.share({
        title: `Характеристики: ${this.productData?.name}`,
        text: 'Посмотрите характеристики этого товара',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          console.log('Ссылка скопирована');
        });
    }
  }
}