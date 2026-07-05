import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NewsBannerFilterDto, SortType } from '../../core/api/news-banner.service';
import { NicheProductsService } from '../../core/api/niche-products.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { TitleComponent } from '../../core/components/title/title.component';

export interface Subcategory {
  id: string;
  name: string;
  slug?: string;
  productCount?: number;
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  productCount?: number;
  imageInstanceLinks: any;
  subcategories?: Subcategory[];
  widthClass?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isPopular?: boolean;
  views?: number;
}

@Component({
  selector: 'app-niche-catalog',
  standalone: true,
  imports: [CommonModule, TitleComponent],
  templateUrl: './niche-catalog.component.html',
  styleUrl: './niche-catalog.component.scss',
  animations: [
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.6s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class NicheCatalogComponent implements OnInit {
  showAll = true;
  maxPerRow = 5;
  pageSize = 20;
  viewMode: 'grid' | 'list' = 'grid';
  visibleCategoriesCount: number = 8;

  categories: Category[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private nicheProductsService: NicheProductsService
  ) { }

  ngOnInit(): void {
    this.loadNicheCategories();
  }

  loadNicheCategories(): void {
    this.isLoading = true;
    this.error = null;

    const filterDto: NewsBannerFilterDto = {
      page: 0,
      pageSize: this.pageSize,
      sorts: [
        {
          field: 'sortIndex',
          sortType: SortType.Ascending
        }
      ]
    };

    this.nicheProductsService.getNewsBannersByFilter(filterDto).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.categories = response.data.map((item: any, index: number) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            image: item.imageInstanceLinks?.[0] || this.getDefaultImage(item.name),
            productCount: item.productCount || 0,
            subcategories: (item.subCategories || []).map((sub: any) => ({
              id: sub.id,
              name: sub.name,
              slug: sub.slug,
              productCount: sub.productCount
            })),
            isFeatured: index === 0,
            isNew: Math.random() > 0.7,
            isPopular: Math.random() > 0.6,
            views: Math.floor(Math.random() * 1000) + 100,
            widthClass: this.getRandomWidthClass()
          }));
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки ниш:', error);
        this.error = 'Не удалось загрузить категории';
        this.isLoading = false;
      }
    });
  }

  private getDefaultImage(categoryName: string): string {
    const defaultImages = [
      'https://images.unsplash.com/photo-1556740764-4b6f3f17a353?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=400&q=80'
    ];

    const hash = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return defaultImages[hash % defaultImages.length];
  }

  toggleShowAll(): void {
    this.showAll = !this.showAll;
  }

  get visibleCategories() {
    return this.showAll
      ? this.categories
      : this.categories.slice(0, this.visibleCategoriesCount);
  }

  getRandomWidthClass(): string {
    const classes = ['w-small', 'w-medium', 'w-large'];
    const randomIndex = Math.floor(Math.random() * classes.length);
    return classes[randomIndex];
  }

  onNicheClick(category: any): void {
    this.router.navigate([`/niche/${category.id}`]);
  }

  getCategoryDescription(category: any): string {
    if (category.description) return category.description;
    if (category.subcategories && category.subcategories.length > 0) {
      return `Товары для ${category.name.toLowerCase()}`;
    }
    return `${category.productCount} товаров`;
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  trackByCategoryId(index: number, category: any): string {
    return category.id || index;
  }

  handleImageError(event: any, category: any): void {
    event.target.src = this.getDefaultImage(category.name);
  }

  onSubcategoryClick(event: MouseEvent, subcategory: any): void {
    event.stopPropagation();
  }

  viewAllCategories(): void {
    this.router.navigate(['/all-solutions']);
  }
}