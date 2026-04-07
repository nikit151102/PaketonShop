import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NicheProductsService, NewsBannerFilterDto, SortType } from '../../../../core/api/niche-products.service';

@Component({
  selector: 'app-groups-section',
  imports: [CommonModule, RouterLink],
  templateUrl: './groups-section.component.html',
  styleUrl: './groups-section.component.scss',
})
export class GroupsSectionComponent implements OnInit {
  @Input() showAll = true;
  @Input() maxPerRow = 5;
  @Input() pageSize = 5; // Количество ниш для загрузки

  categories: any[] = [];
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
      next: (response) => {
        if (response && response.data) {
          // Преобразуем данные из API в формат для отображения
          this.categories = response.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            image: item.imageInstanceLinks[0] || this.getDefaultImage(item.name),
            productCount: item.productCount,
            subcategories: item.subCategories || [],
            // Добавляем случайный класс ширины для разнообразия отображения
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

  // Получаем изображение по умолчанию на основе названия категории
  private getDefaultImage(categoryName: string): string {
    const defaultImages = [
      'https://images.unsplash.com/photo-1556740764-4b6f3f17a353?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=400&q=80'
    ];

    // Используем хеш названия для выбора изображения
    const hash = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return defaultImages[hash % defaultImages.length];
  }

  toggleShowAll(): void {
    this.showAll = !this.showAll;
  }

  get visibleCategories() {
    if (this.showAll) return this.categories;
    return this.categories.slice(0, 2 * this.maxPerRow);
  }

  getRandomWidthClass(): string {
    const classes = ['w-small', 'w-medium', 'w-large'];
    const randomIndex = Math.floor(Math.random() * classes.length);
    return classes[randomIndex];
  }

  onNicheClick(category: any): void {
    // Переходим на страницу с продуктами выбранной ниши
    this.router.navigate([`/niche/${category.id}`]);
  }

  getCategoryDescription(category: any): string {
    if (category.description) return category.description;
    if (category.subcategories && category.subcategories.length > 0) {
      return `Товары для ${category.name.toLowerCase()}`;
    }
    return `${category.productCount} товаров`;
  }
}