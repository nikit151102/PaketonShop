import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Component, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductCardComponent } from './product-card/product-card.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductsService } from '../../core/services/products.service';
import { QuestionsComponent } from './questions/questions.component';
import { ReviewsComponent } from './reviews/reviews.component';
import { TitleComponent } from '../../core/components/title/title.component';
import { Meta, Title } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [
    CommonModule,
    ProductCardComponent,
    QuestionsComponent,
    ReviewsComponent,
    RouterLink,
    TitleComponent
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
export class CardComponent implements OnDestroy {
  activeTab: 'description' | 'features' | 'reviews' | 'questions' = 'description';
  productData: any;
  breadCrumbs: any;

  private meta = inject(Meta);
  private titleService = inject(Title);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);

  private destroy$ = new Subject<void>();

  constructor() {
    // ✅ Данные уже есть из resolver'а — мета-теги применятся на сервере
    const resolvedData = this.route.snapshot.data['productData'];
    if (resolvedData) {
      this.productData = resolvedData.data;
      this.breadCrumbs = resolvedData.breadCrumbs;
      this.updateMetaTags();
    }

    // Подписка на смену id при навигации между товарами
    this.route.data
      .pipe(takeUntil(this.destroy$))
      .subscribe((routeData) => {
        const product = routeData['productData'];
        if (product && product.data?.id !== this.productData?.id) {
          this.productData = product.data;
          this.breadCrumbs = product.breadCrumbs;
          this.updateMetaTags();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateMetaTags(): void {
    if (!this.productData) return;

    const productName = this.productData.name || 'Товар';
    const price = this.productData.price || 0;
    const description = this.productData.description ||
      `${productName} — цена ${price} ₽, характеристики, фото, отзывы. Доставка по России.`;
    const imageUrl = this.productData.mainImage || this.productData.images?.[0] || '';
    
    // ✅ Используем Router вместо window.location.href (безопасно для SSR)
    const currentUrl = `https://пакетон.рф${this.router.url}`;

    // Обновляем Title
    this.titleService.setTitle(`${productName} — купить в Пакетон.рф`);

    // Удаляем старые мета-теги
    this.meta.removeTag('property="og:title"');
    this.meta.removeTag('property="og:description"');
    this.meta.removeTag('property="og:image"');
    this.meta.removeTag('property="og:url"');
    this.meta.removeTag('property="og:type"');
    this.meta.removeTag('name="description"');
    this.meta.removeTag('name="twitter:card"');
    this.meta.removeTag('name="twitter:title"');
    this.meta.removeTag('name="twitter:description"');
    this.meta.removeTag('name="twitter:image"');

    // Стандартные мета-теги
    this.meta.addTag({ name: 'description', content: description });

    // Open Graph
    this.meta.addTag({ property: 'og:title', content: `${productName} — купить в Пакетон.рф` });
    this.meta.addTag({ property: 'og:description', content: description });
    this.meta.addTag({ property: 'og:image', content: imageUrl });
    this.meta.addTag({ property: 'og:url', content: currentUrl });
    this.meta.addTag({ property: 'og:type', content: 'product' });
    this.meta.addTag({ property: 'og:site_name', content: 'Пакетон.рф' });

    // Twitter Card
    this.meta.addTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.addTag({ name: 'twitter:title', content: `${productName} — купить в Пакетон.рф` });
    this.meta.addTag({ name: 'twitter:description', content: description });
    this.meta.addTag({ name: 'twitter:image', content: imageUrl });
  }

  setTab(tab: 'description' | 'features' | 'reviews' | 'questions') {
    this.activeTab = tab;
  }

  getProductSpecs() {
    return this.productData?.productProperties || [];
  }

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

  copyDescription(): void {
    // 🔒 Защита от падения на сервере
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.productData?.description) return;

    navigator.clipboard.writeText(this.productData.description)
      .then(() => { /* показать уведомление */ })
      .catch(err => { });
  }

  printSpecs(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.print();
  }

  shareSpecs(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (navigator.share) {
      navigator.share({
        title: `Характеристики: ${this.productData?.name}`,
        text: 'Посмотрите характеристики этого товара',
        url: this.document.location.href
      });
    } else {
      navigator.clipboard.writeText(this.document.location.href)
        .then(() => { });
    }
  }
}